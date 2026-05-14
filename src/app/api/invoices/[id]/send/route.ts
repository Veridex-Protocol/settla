import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { sendEmail } from "@/lib/email";
import { generateShortCode } from "@/lib/utils";

// POST /api/invoices/[id]/send - Send invoice to customer via email
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
        
        const invoice = await db.invoice.findUnique({
            where: { id },
            include: { business: true },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.businessId !== authUser.businessId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!invoice.customerEmail) {
            return NextResponse.json({ error: "Customer email is required to send invoice" }, { status: 400 });
        }

        // Parse line items
        const items = (invoice.items as Array<{
            description: string;
            quantity?: number;
            amount?: number;
            unitPrice?: number;
        }>) || [];

        const lineItems = items.map(item => ({
            description: item.description || 'Item',
            amount: ((item.quantity || 1) * (item.unitPrice || item.amount || 0)).toFixed(2),
        }));

        // Lookup or create a PaymentLink for this invoice
        let paymentLink = invoice.paymentLink;
        if (!paymentLink) {
            // Calculate grace period: due date + 7 days
            const expiry = invoice.dueDate
                ? new Date(invoice.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days

            paymentLink = await db.paymentLink.create({
                data: {
                    businessId: authUser.businessId,
                    shortCode: `pay-${generateShortCode(8)}`,
                    amount: invoice.amount,
                    currency: invoice.currency,
                    invoiceId: id,
                    maxUses: 1, // One-time payment
                    expiresAt: expiry,
                    status: 'active',
                },
            });

            // Link the payment link back to the invoice
            await db.invoice.update({
                where: { id },
                data: { paymentLinkId: paymentLink.id },
            });
        }

        const paymentLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${paymentLink.shortCode}`;

        // Send email using the invoice_created template
        await sendEmail('invoice_created', { email: invoice.customerEmail }, {
            businessName: invoice.business.name,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            amount: invoice.amount.toString(),
            currency: invoice.currency,
            dueDate: invoice.dueDate 
                ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric',
                })
                : 'Upon Receipt',
            items: lineItems,
            paymentLink: paymentLinkUrl, // Add the payment link URL
        });

        // Update invoice status to 'sent'
        await db.invoice.update({
            where: { id },
            data: { status: 'sent' },
        });

        return NextResponse.json({ success: true, message: "Invoice sent successfully" });
    } catch (error) {
        console.error("[INVOICE_SEND]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
