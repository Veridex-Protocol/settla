import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { generateReceiptPDF, type ReceiptData } from "@/lib/pdf-receipt";

// POST /api/receipts/[id]/download - Download receipt as PDF
export async function POST(
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

        const transaction = receipt.transaction;

        // Parse line items from invoice if present
        const invoiceItems = transaction.invoice?.items as Array<{
            description: string;
            quantity?: number;
            amount?: number;
            unitPrice?: number;
        }> || [];

        const items = invoiceItems.length > 0
            ? invoiceItems.map(item => ({
                description: item.description || 'Item',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || item.amount || 0,
                total: (item.quantity || 1) * (item.unitPrice || item.amount || 0),
            }))
            : [{
                description: 'Payment',
                quantity: 1,
                unitPrice: Number(transaction.amount),
                total: Number(transaction.amount),
            }];

        // Build receipt data for PDF
        const receiptData: ReceiptData = {
            receiptNumber: receipt.receiptNumber,
            date: new Date(transaction.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            status: transaction.status === 'confirmed' || transaction.status === 'settled' ? 'paid' : 'pending',
            business: {
                name: transaction.business.name,
                email: transaction.business.email,
            },
            customer: {
                name: transaction.invoice?.customerName || 'Customer',
                email: transaction.invoice?.customerEmail || '',
            },
            items,
            subtotal: Number(transaction.amount),
            total: Number(transaction.amount),
            currency: transaction.currency,
            payment: {
                method: transaction.payerAddress ? 'Wallet' : 'Passkey',
                txHash: transaction.txHash || undefined,
                paidAt: transaction.createdAt.toISOString(),
                walletAddress: transaction.payerAddress || undefined,
                chainId: 11155111, // Ethereum Sepolia - Sera's primary network
            },
        };

        // Generate PDF
        const pdfBuffer = await generateReceiptPDF(receiptData);

        // Return PDF as download
        const pdfArrayBuffer = pdfBuffer.buffer.slice(
            pdfBuffer.byteOffset,
            pdfBuffer.byteOffset + pdfBuffer.byteLength
        ) as ArrayBuffer;

        return new NextResponse(pdfArrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error("[RECEIPT_DOWNLOAD]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
