import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { generateReceiptPDF, type ReceiptData } from "@/lib/pdf-receipt";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const generateReceiptSchema = z.object({
    transactionId: z.string().min(1, "Transaction ID is required"),
    sendEmail: z.boolean().default(false),
    customerEmail: z.string().email().optional(),
});

// POST /api/receipts/generate - Generate a PDF receipt
export async function POST(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validation = generateReceiptSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { transactionId, sendEmail: shouldSendEmail, customerEmail } = validation.data;

        // Fetch transaction with related data
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                business: true,
                invoice: true,
                paymentLink: true,
            },
        });

        if (!transaction) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        if (transaction.businessId !== authUser.businessId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Generate receipt number
        const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;

        // Build receipt data
        const receiptData: ReceiptData = {
            receiptNumber,
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
                email: customerEmail || transaction.invoice?.customerEmail || '',
            },
            items: transaction.invoice?.items
                ? (transaction.invoice.items as Array<{ description: string; quantity?: number; amount: number }>).map(item => ({
                    description: item.description,
                    quantity: item.quantity || 1,
                    unitPrice: item.amount / (item.quantity || 1),
                    total: item.amount,
                }))
                : [{
                    description: 'Payment',
                    quantity: 1,
                    unitPrice: Number(transaction.amount),
                    total: Number(transaction.amount),
                }],
            subtotal: Number(transaction.amount),
            total: Number(transaction.amount),
            currency: transaction.currency,
            payment: {
                method: 'Stablecoin',
                txHash: transaction.txHash || undefined,
                paidAt: transaction.updatedAt.toISOString(),
                walletAddress: transaction.payerAddress || undefined,
                chainId: 11155111, // Ethereum Sepolia - Sera's primary network
            },
        };

        // Generate PDF
        const pdfBuffer = await generateReceiptPDF(receiptData);

        // Check if we should just return the PDF or also send email
        if (shouldSendEmail && customerEmail) {
            // In production, upload PDF to storage and get URL
            // For now, we'll skip the PDF attachment in email
            await sendEmail('receipt', { email: customerEmail }, {
                businessName: transaction.business.name,
                receiptNumber,
                amount: transaction.amount.toString(),
                currency: transaction.currency,
                date: receiptData.date,
                items: receiptData.items.map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice.toString(),
                    total: i.total.toString(),
                })),
                subtotal: receiptData.subtotal.toString(),
                total: receiptData.total.toString(),
            });

            // Save receipt record
            await prisma.receipt.create({
                data: {
                    transactionId: transaction.id,
                    receiptNumber,
                    emailSent: true,
                },
            });
        } else {
            // Save receipt record without email
            await prisma.receipt.create({
                data: {
                    transactionId: transaction.id,
                    receiptNumber,
                    emailSent: false,
                },
            });
        }

        // Return PDF as download
        const pdfArrayBuffer = pdfBuffer.buffer.slice(
            pdfBuffer.byteOffset,
            pdfBuffer.byteOffset + pdfBuffer.byteLength
        ) as ArrayBuffer;
        
        return new NextResponse(pdfArrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="receipt-${receiptNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Failed to generate receipt:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET /api/receipts - List all receipts
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all receipts with their transactions for this business
        const receipts = await prisma.receipt.findMany({
            where: {
                transaction: {
                    businessId: authUser.businessId,
                },
            },
            include: {
                transaction: {
                    include: {
                        business: true,
                        invoice: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Transform receipts to include all needed data
        const formattedReceipts = receipts.map((receipt: typeof receipts[number]) => ({
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
        }));

        return NextResponse.json(formattedReceipts);
    } catch (error) {
        console.error("Failed to fetch receipts:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
