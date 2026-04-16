import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { sendEmail } from "@/lib/email";

// POST /api/receipts/[id]/send - Send receipt to customer via email
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

        // Optionally accept a customer email override in the request body
        let customerEmailOverride: string | undefined;
        try {
            const body = await request.json();
            customerEmailOverride = body.customerEmail;
        } catch {
            // Body is optional
        }

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

        const customerEmail = customerEmailOverride || receipt.transaction.invoice?.customerEmail;
        
        if (!customerEmail) {
            return NextResponse.json({ error: "Customer email is required to send receipt" }, { status: 400 });
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
                unitPrice: (item.unitPrice || item.amount || 0).toString(),
                total: ((item.quantity || 1) * (item.unitPrice || item.amount || 0)).toString(),
            }))
            : [{
                description: 'Payment',
                quantity: 1,
                unitPrice: transaction.amount.toString(),
                total: transaction.amount.toString(),
            }];

        // Send email
        await sendEmail('receipt', { email: customerEmail }, {
            businessName: transaction.business.name,
            receiptNumber: receipt.receiptNumber,
            amount: transaction.amount.toString(),
            currency: transaction.currency,
            date: new Date(transaction.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            items,
            subtotal: transaction.amount.toString(),
            total: transaction.amount.toString(),
        });

        // Update receipt to mark email as sent
        await prisma.receipt.update({
            where: { id },
            data: { emailSent: true },
        });

        return NextResponse.json({ success: true, message: "Receipt sent successfully" });
    } catch (error) {
        console.error("[RECEIPT_SEND]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
