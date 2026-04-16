import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { generateInvoicePDF, type InvoiceData, type InvoiceItem } from "@/lib/pdf-invoice";

// POST /api/invoices/[id]/download - Download invoice as PDF
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

        // Parse line items from JSON
        const items = (invoice.items as Array<{
            description: string;
            quantity?: number;
            amount?: number;
            unitPrice?: number;
        }>) || [];

        const lineItems: InvoiceItem[] = items.map(item => ({
            description: item.description || 'Item',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || item.amount || 0,
            total: (item.quantity || 1) * (item.unitPrice || item.amount || 0),
        }));

        // Calculate subtotal from items
        const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
        const total = Number(invoice.amount);

        // Build invoice data for PDF
        const invoiceData: InvoiceData = {
            invoiceNumber: invoice.invoiceNumber,
            issueDate: new Date(invoice.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            dueDate: invoice.dueDate 
                ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })
                : undefined,
            status: invoice.status as InvoiceData['status'],
            business: {
                name: invoice.business.name,
                email: invoice.business.email,
            },
            customer: {
                name: invoice.customerName,
                email: invoice.customerEmail || undefined,
            },
            items: lineItems.length > 0 ? lineItems : [{
                description: 'Invoice Amount',
                quantity: 1,
                unitPrice: total,
                total: total,
            }],
            subtotal: subtotal || total,
            total: total,
            currency: invoice.currency,
            notes: invoice.notes || undefined,
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Return PDF as download
        const pdfArrayBuffer = pdfBuffer.buffer.slice(
            pdfBuffer.byteOffset,
            pdfBuffer.byteOffset + pdfBuffer.byteLength
        ) as ArrayBuffer;

        return new NextResponse(pdfArrayBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
            },
        });
    } catch (error) {
        console.error("[INVOICE_DOWNLOAD]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
