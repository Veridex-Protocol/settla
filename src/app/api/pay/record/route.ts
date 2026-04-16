import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac, timingSafeEqual } from "crypto";

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB (VDX-API-006)

/**
 * Verify HMAC-SHA256 signature on the request body.
 * The client must send the signature in x-payment-signature header
 * computed as HMAC-SHA256(PAYMENT_WEBHOOK_SECRET, rawBody).
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return false;
    if (!signature) return false;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Record a completed payment transaction
 * POST /api/pay/record
 *
 * VDX-API-001: Requires HMAC signature verification via PAYMENT_WEBHOOK_SECRET.
 * Transactions are recorded as "pending" — a background job must verify on-chain
 * before flipping to "confirmed".
 */
export async function POST(req: Request) {
    try {
        // VDX-API-006: Reject oversized payloads
        const contentLength = req.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        const rawBody = await req.text();

        // VDX-API-006: Double-check actual body size
        if (Buffer.byteLength(rawBody, "utf-8") > MAX_BODY_SIZE) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        // VDX-API-001: Verify HMAC signature
        const signature = req.headers.get("x-payment-signature");
        if (!verifySignature(rawBody, signature)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const {
            paymentLinkId,
            txHash,
            payerAddress,
            amount,
            currency,
        } = body;

        if (!paymentLinkId || !txHash || !payerAddress || !amount) {
            return NextResponse.json({
                error: "Missing required fields: paymentLinkId, txHash, payerAddress, amount"
            }, { status: 400 });
        }

        // VDX-API-001: Reject duplicate txHash to prevent replay / DoS
        const existingTx = await prisma.transaction.findFirst({
            where: { txHash },
            select: { id: true },
        });
        if (existingTx) {
            return NextResponse.json({ error: "Transaction already recorded" }, { status: 409 });
        }

        // Get the payment link
        const paymentLink = await prisma.paymentLink.findUnique({
            where: { id: paymentLinkId },
            include: { business: true }
        });

        if (!paymentLink) {
            return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
        }

        // Check if already used max times
        if (paymentLink.maxUses && paymentLink.usedCount >= paymentLink.maxUses) {
            return NextResponse.json({ error: "Payment link has reached max uses" }, { status: 400 });
        }

        // Start a transaction to ensure atomicity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create the transaction record
            // VDX-API-001: Status is "pending" — requires background verification
            const transaction = await tx.transaction.create({
                data: {
                    businessId: paymentLink.businessId,
                    paymentLinkId: paymentLink.id,
                    invoiceId: paymentLink.invoiceId,
                    type: "inflow",
                    amount: typeof amount === 'string' ? parseFloat(amount) : amount,
                    currency: currency || paymentLink.currency,
                    txHash: txHash,
                    status: "pending",
                    payerAddress: payerAddress,
                    metadata: {
                        source: "payment_link",
                        shortCode: paymentLink.shortCode,
                    }
                }
            });

            // 2. Update payment link usage count
            const newUsedCount = paymentLink.usedCount + 1;
            const shouldDeactivate = paymentLink.maxUses ? newUsedCount >= paymentLink.maxUses : false;

            await tx.paymentLink.update({
                where: { id: paymentLink.id },
                data: {
                    usedCount: newUsedCount,
                    status: shouldDeactivate ? "used" : paymentLink.status,
                }
            });

            // 3. Create a receipt
            const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
            const receipt = await tx.receipt.create({
                data: {
                    transactionId: transaction.id,
                    receiptNumber: receiptNumber,
                    pdfUrl: null,
                    emailSent: false,
                }
            });

            // 4. Invoice status update deferred until transaction is confirmed
            // by the background verification job (no longer auto-marking as "paid")

            return { transaction, receipt, paymentLinkUpdated: true, shouldDeactivate };
        });

        console.log("[PAY_RECORD_POST] Transaction recorded (pending):", {
            transactionId: result.transaction.id,
            receiptNumber: result.receipt.receiptNumber,
            shouldDeactivate: result.shouldDeactivate,
        });

        return NextResponse.json({
            success: true,
            transactionId: result.transaction.id,
            receiptNumber: result.receipt.receiptNumber,
            paymentLinkStatus: result.shouldDeactivate ? "used" : "active"
        });

    } catch (error) {
        console.error("[PAY_RECORD_POST] Error:", error);
        // VDX-API-008: Never leak internal error details to the client
        return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
    }
}
