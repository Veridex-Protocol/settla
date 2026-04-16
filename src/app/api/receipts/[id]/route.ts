import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET /api/receipts/[id] - Get a specific receipt
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const receipt = await prisma.receipt.findUnique({
            where: { id },
            include: {
                transaction: {
                    include: {
                        business: true,
                        invoice: true,
                    },
                },
            },
        });

        if (!receipt) {
            return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
        }

        if (receipt.transaction.businessId !== authUser.businessId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({
            id: receipt.id,
            receiptNumber: receipt.receiptNumber,
            transactionId: receipt.transactionId,
            invoiceNumber: receipt.transaction.invoice?.invoiceNumber || null,
            customer: {
                name: receipt.transaction.invoice?.customerName || 'Customer',
                email: receipt.transaction.invoice?.customerEmail || '',
            },
            amount: Number(receipt.transaction.amount),
            currency: receipt.transaction.currency,
            txHash: receipt.transaction.txHash,
            paymentMethod: receipt.transaction.payerAddress ? 'Wallet' : 'Passkey',
            paidAt: receipt.transaction.createdAt,
            createdAt: receipt.createdAt,
            emailSent: receipt.emailSent,
            pdfUrl: receipt.pdfUrl,
            business: {
                name: receipt.transaction.business.name,
                email: receipt.transaction.business.email,
            },
            items: receipt.transaction.invoice?.items || [],
        });
    } catch (error) {
        console.error("[RECEIPT_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// DELETE /api/receipts/[id] - Delete a receipt
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const receipt = await prisma.receipt.findUnique({
            where: { id },
            include: { transaction: true },
        });

        if (!receipt) {
            return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
        }

        if (receipt.transaction.businessId !== authUser.businessId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.receipt.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[RECEIPT_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
