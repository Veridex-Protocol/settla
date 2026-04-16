import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { generateInvoicePDF, type InvoiceData } from "@/lib/pdf-invoice";
import { sendEmail } from "@/lib/email";

// GET /api/invoices/[id] - Get a specific invoice
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

        return NextResponse.json(invoice);
    } catch (error) {
        console.error("[INVOICE_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// PATCH /api/invoices/[id] - Update invoice status or details
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // VDX-API-006: Reject oversized payloads
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        const { id } = await params;
        const body = await request.json();

        const invoice = await db.invoice.findUnique({
            where: { id },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.businessId !== authUser.businessId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // VDX-API-002: Whitelist allowed fields to prevent mass assignment.
        // Immutable fields (businessId, amount, currency, invoiceNumber, items, paymentLinkId,
        // createdAt, updatedAt) are explicitly excluded.
        const ALLOWED_UPDATE_FIELDS = ['status', 'notes', 'dueDate', 'customerName', 'customerEmail'];
        const sanitized: Record<string, unknown> = {};
        for (const key of ALLOWED_UPDATE_FIELDS) {
            if (key in body) {
                sanitized[key] = body[key];
            }
        }

        if (Object.keys(sanitized).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const updated = await db.invoice.update({
            where: { id },
            data: sanitized,
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[INVOICE_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

// DELETE /api/invoices/[id] - Delete an invoice
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

        const invoice = await db.invoice.findUnique({
            where: { id },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        if (invoice.businessId !== authUser.businessId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get the payment link if there's one associated
        let paymentLink = null;
        if (invoice.paymentLinkId) {
            paymentLink = await db.paymentLink.findUnique({
                where: { id: invoice.paymentLinkId },
            });
        }

        // Clear the invoiceId from any related transactions (don't delete them, just unlink)
        await db.transaction.updateMany({
            where: { invoiceId: id },
            data: { invoiceId: null },
        });

        // Delete the invoice
        await db.invoice.delete({ where: { id } });

        // Also delete the associated payment link if it exists and hasn't been used
        if (paymentLink && paymentLink.usedCount === 0) {
            try {
                await db.paymentLink.delete({ where: { id: paymentLink.id } });
            } catch (e) {
                // Ignore if payment link doesn't exist or can't be deleted
                console.log("Could not delete associated payment link:", e);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[INVOICE_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
