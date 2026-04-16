import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { z } from "zod";
import { generateShortCode } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { updateInvoiceGoals } from "@/lib/services/goal-service";

const createInvoiceSchema = z.object({
    customerName: z.string().min(1, "Customer name is required"),
    customerEmail: z.string().email().optional().or(z.literal("")),
    amount: z.number().or(z.string()),
    currency: z.string().min(3),
    dueDate: z.string().optional(),
    items: z.array(z.any()),
    notes: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const validation = createInvoiceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(validation.error.issues, { status: 400 });
        }

        const { customerName, customerEmail, amount, currency, dueDate, items, notes } = validation.data;

        // Generate invoice number
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const count = await db.invoice.count({
            where: { businessId: authUser.businessId },
        });
        const sequence = (count + 1).toString().padStart(4, "0");
        const invoiceNumber = `INV-${year}${month}-${sequence}`;

        // Calculate expiration date (default: 30 days from due date, or 30 days from now if no due date)
        const expiresAt = dueDate
            ? new Date(new Date(dueDate).getTime() + 30 * 24 * 60 * 60 * 1000)  // 30 days after due date
            : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);  // 60 days from now

        // Auto-generate payment link for the invoice
        const shortCode = `pay-${generateShortCode(8)}`;

        const paymentLink = await db.paymentLink.create({
            data: {
                businessId: authUser.businessId,
                shortCode,
                amount: parseFloat(String(amount)),
                currency,
                maxUses: 1, // Invoice payments are single-use
                expiresAt,
                status: 'active',
            },
        });

        const invoice = await db.invoice.create({
            data: {
                invoiceNumber,
                businessId: authUser.businessId,
                customerName,
                customerEmail: customerEmail || null,
                amount: String(amount),
                currency,
                dueDate: dueDate ? new Date(dueDate) : null,
                items: items ?? [],
                notes,
                status: "pending",
                paymentLinkId: paymentLink.id,
            },
        });

        // Update the payment link with the invoice ID (required for invoice status update on payment)
        await db.paymentLink.update({
            where: { id: paymentLink.id },
            data: { invoiceId: invoice.id },
        });

        // Automatically send email if customer email is provided
        let emailSent = false;
        if (customerEmail) {
            try {
                // Get business info for the email
                const business = await db.business.findUnique({
                    where: { id: authUser.businessId },
                });

                if (business) {
                    // Parse line items for the email
                    const lineItems = (items || []).map((item: { description?: string; quantity?: number; amount?: number; unitPrice?: number }) => ({
                        description: item.description || 'Item',
                        amount: ((item.quantity || 1) * (item.unitPrice || item.amount || 0)).toFixed(2),
                    }));

                    await sendEmail('invoice_created', { email: customerEmail }, {
                        businessName: business.name,
                        invoiceNumber,
                        customerName,
                        amount: String(amount),
                        currency,
                        dueDate: dueDate 
                            ? new Date(dueDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long', 
                                day: 'numeric',
                            })
                            : 'Upon Receipt',
                        items: lineItems,
                    });

                    // Update invoice status to 'sent'
                    await db.invoice.update({
                        where: { id: invoice.id },
                        data: { status: 'sent' },
                    });

                    emailSent = true;
                    console.log(`[INVOICES_POST] Email sent to ${customerEmail} for invoice ${invoiceNumber}`);
                }
            } catch (emailError) {
                // Log error but don't fail the invoice creation
                console.error("[INVOICES_POST] Failed to send email:", emailError);
                // Invoice stays in 'pending' status so user can manually resend
            }
        }

        // Update invoice goal progress (Phase 2 gamification)
        try {
            await updateInvoiceGoals(authUser.id);
        } catch (goalError) {
            console.error("[INVOICES_POST] Failed to update invoice goals:", goalError);
        }

        return NextResponse.json({ ...invoice, emailSent });
    } catch (error) {
        console.error("[INVOICES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Auto-sync: Find invoices that should be marked as paid
        // (invoices with payment links that have been used, but invoice status is still pending/sent)
        const invoicesNeedingSync = await db.invoice.findMany({
            where: {
                businessId: authUser.businessId,
                status: { in: ['pending', 'sent'] },
                paymentLinkId: { not: null },
            },
            include: {
                paymentLink: {
                    select: {
                        usedCount: true,
                        maxUses: true,
                        transactions: {
                            where: { status: { in: ['confirmed', 'settled'] } },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        // Update invoices that have confirmed/settled transactions
        const syncPromises = invoicesNeedingSync
            .filter((inv: typeof invoicesNeedingSync[number]) => {
                const pl = inv.paymentLink;
                // Mark as paid if: has confirmed transactions OR usedCount > 0
                return pl && (pl.transactions.length > 0 || pl.usedCount > 0);
            })
            .map((inv: typeof invoicesNeedingSync[number]) => 
                db.invoice.update({
                    where: { id: inv.id },
                    data: { status: 'paid' }
                })
            );

        if (syncPromises.length > 0) {
            await Promise.all(syncPromises);
            console.log(`[INVOICES_GET] Auto-synced ${syncPromises.length} invoice(s) to paid status`);
        }

        // Fetch all invoices (now with updated statuses)
        const invoices = await db.invoice.findMany({
            where: {
                businessId: authUser.businessId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        console.error("[INVOICES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
