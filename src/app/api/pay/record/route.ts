import { NextResponse } from "next/server";
import { JsonRpcProvider, isHexString } from "ethers";
import { prisma } from "@/lib/db";
import { createHmac, timingSafeEqual } from "crypto";
import {
    checkPaymentAchievements,
    getBusinessOwnerUserId,
} from "@/lib/services/achievement-service";

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB (VDX-API-006)

// Server-side RPC for on-chain receipt verification. Same precedence as
// /api/chain/sera-intent so all settlement paths share a provider config.
const RPC_URL =
    process.env.SETTLEMENT_RPC_URL ||
    process.env.ALCHEMY_SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://rpc.sepolia.org";

let cachedProvider: JsonRpcProvider | null = null;
function getProvider(): JsonRpcProvider {
    if (!cachedProvider) cachedProvider = new JsonRpcProvider(RPC_URL);
    return cachedProvider;
}

/**
 * Verify a txHash is mined and successful on-chain before we persist anything.
 * Returns:
 *   { ok: true, blockNumber }            – receipt found and status === 1
 *   { ok: false, reason: 'pending' }     – not yet mined, client should retry
 *   { ok: false, reason: 'reverted' }    – mined but reverted (status 0)
 *   { ok: false, reason: 'rpc_error' }   – RPC failure, client should retry
 */
async function verifyTxOnChain(
    txHash: string,
): Promise<
    | { ok: true; blockNumber: number }
    | { ok: false; reason: "pending" | "reverted" | "rpc_error" }
> {
    try {
        const receipt = await getProvider().getTransactionReceipt(txHash);
        if (!receipt) return { ok: false, reason: "pending" };
        if (receipt.status === 1) return { ok: true, blockNumber: receipt.blockNumber };
        return { ok: false, reason: "reverted" };
    } catch (err) {
        console.warn("[PAY_RECORD_POST] getTransactionReceipt failed:", err);
        return { ok: false, reason: "rpc_error" };
    }
}

/**
 * Verify HMAC-SHA256 signature on the request body.
 * Service-to-service callers (e.g. settlement workers) send the signature in
 * x-payment-signature computed as HMAC-SHA256(PAYMENT_WEBHOOK_SECRET, rawBody).
 *
 * Returns:
 *   "valid"   – signature present and matches
 *   "invalid" – signature present but does not match (reject)
 *   "absent"  – no signature header; fall back to public-payer path
 */
function verifySignature(rawBody: string, signature: string | null): "valid" | "invalid" | "absent" {
    if (!signature) return "absent";
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return "invalid";

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (expected.length !== signature.length) return "invalid";
    try {
        return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) ? "valid" : "invalid";
    } catch {
        return "invalid";
    }
}

/**
 * Record a completed payment transaction
 * POST /api/pay/record
 *
 * VDX-API-001: Requires HMAC signature verification via PAYMENT_WEBHOOK_SECRET
 * for service-to-service callers. Anonymous payer submissions are accepted
 * without a signature but the txHash is verified on-chain (status === 1)
 * before anything is persisted, so replays / fakes never reach the DB.
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

        // VDX-API-001: Verify HMAC signature for service-to-service callers.
        // The public payer page (/pay/[id]) is anonymous and cannot sign — those
        // submissions land here without a signature and are accepted on the
        // public-payer path. Authenticity for both paths ultimately relies on:
        //   (a) paymentLink must exist + still be active (checked below),
        //   (b) txHash dedupe (checked below),
        //   (c) status is recorded as "pending" until the on-chain verification
        //       worker confirms the tx — replays / fakes never reach "confirmed".
        const signature = req.headers.get("x-payment-signature");
        const sigState = verifySignature(rawBody, signature);
        if (sigState === "invalid") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const {
            paymentLinkId,
            paymentLinkShortCode,
            txHash,
            payerAddress,
            amount,
            currency,
        } = body;

        // VDX-API-005: the public /api/pay/[id] response omits the internal id
        // and only exposes shortCode. Accept either so the payment page can
        // record without re-fetching internal identifiers.
        const linkLookup = paymentLinkId ?? paymentLinkShortCode;

        const missing: string[] = [];
        if (!linkLookup) missing.push('paymentLinkId|paymentLinkShortCode');
        if (!txHash) missing.push('txHash');
        if (!payerAddress) missing.push('payerAddress');
        if (!amount) missing.push('amount');

        if (missing.length > 0) {
            console.warn('[PAY_RECORD_POST] Missing fields:', missing, {
                paymentLinkId: typeof paymentLinkId,
                paymentLinkShortCode: typeof paymentLinkShortCode,
                txHash: typeof txHash,
                payerAddress: typeof payerAddress,
                amount: typeof amount,
                currency,
                hasSwapQuote: 'swapQuote' in body,
                hasTradeId: 'tradeId' in body,
            });
            return NextResponse.json({
                error: `Missing required fields: ${missing.join(', ')}`,
                missing,
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

        // VDX-API-001: Verify the txHash is mined and successful on-chain BEFORE
        // we touch the DB. We don't store pending rows — only confirmed payments.
        // The public payer page polls /api/pay/record until it gets 200 or 400.
        if (!isHexString(txHash, 32)) {
            return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });
        }
        const verification = await verifyTxOnChain(txHash);
        if (!verification.ok) {
            if (verification.reason === "reverted") {
                return NextResponse.json(
                    { error: "Transaction reverted on-chain", reason: "reverted" },
                    { status: 400 },
                );
            }
            // pending or rpc_error → tell the client to retry
            return NextResponse.json(
                { error: "Transaction not yet confirmed", reason: verification.reason },
                { status: 202 },
            );
        }

        // Resolve link by id or shortCode (whichever was provided).
        const paymentLink = await prisma.paymentLink.findFirst({
            where: paymentLinkId
                ? { id: paymentLinkId }
                : { shortCode: paymentLinkShortCode },
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
            // 1. Create the transaction record (confirmed — on-chain receipt verified above)
            const transaction = await tx.transaction.create({
                data: {
                    businessId: paymentLink.businessId,
                    paymentLinkId: paymentLink.id,
                    invoiceId: paymentLink.invoiceId,
                    type: "inflow",
                    amount: typeof amount === 'string' ? parseFloat(amount) : amount,
                    currency: currency || paymentLink.currency,
                    txHash: txHash,
                    status: "confirmed",
                    payerAddress: payerAddress,
                    metadata: {
                        source: "payment_link",
                        shortCode: paymentLink.shortCode,
                        blockNumber: verification.blockNumber,
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

            // 4. Mark linked invoice paid (tx is on-chain confirmed)
            if (paymentLink.invoiceId) {
                await tx.invoice.update({
                    where: { id: paymentLink.invoiceId },
                    data: { status: "paid" },
                });
            }

            return { transaction, receipt, paymentLinkUpdated: true, shouldDeactivate };
        });

        console.log("[PAY_RECORD_POST] Transaction recorded (confirmed):", {
            transactionId: result.transaction.id,
            receiptNumber: result.receipt.receiptNumber,
            blockNumber: verification.blockNumber,
            shouldDeactivate: result.shouldDeactivate,
        });

        // Fire gamification checks. Best-effort — never block the response on
        // achievement errors.
        try {
            const ownerUserId = await getBusinessOwnerUserId(paymentLink.businessId);
            if (ownerUserId) {
                const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
                await checkPaymentAchievements(
                    ownerUserId,
                    paymentLink.businessId,
                    numericAmount,
                );
            }
        } catch (gamErr) {
            console.error("[PAY_RECORD_POST] achievement check failed:", gamErr);
        }

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
