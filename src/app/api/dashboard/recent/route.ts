import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get recent transactions (last 10)
        const recentTransactions = await db.transaction.findMany({
            where: {
                businessId: authUser.businessId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
            include: {
                invoice: { select: { invoiceNumber: true, customerName: true } },
                paymentLink: { select: { shortCode: true } },
            },
        });

        // Get pending invoices
        const pendingInvoices = await db.invoice.findMany({
            where: {
                businessId: authUser.businessId,
                status: { in: ['sent', 'draft'] },
            },
            orderBy: {
                dueDate: 'asc',
            },
            take: 5,
        });

        // Format transactions
        const formattedTransactions = recentTransactions.map((tx: {
            id: string;
            type: string;
            amount: unknown;
            currency: string;
            status: string;
            payerAddress: string | null;
            createdAt: Date;
            txHash: string | null;
            invoice: { invoiceNumber: string; customerName: string } | null;
            paymentLink: { shortCode: string } | null;
        }) => ({
            id: tx.id,
            type: tx.type,
            amount: Number(tx.amount),
            currency: tx.currency,
            status: tx.status,
            from: tx.payerAddress || 'Unknown',
            description: tx.invoice?.invoiceNumber
                ? `Invoice #${tx.invoice.invoiceNumber}`
                : tx.paymentLink?.shortCode
                    ? `Payment Link ${tx.paymentLink.shortCode}`
                    : 'Direct Payment',
            timestamp: tx.createdAt,
            txHash: tx.txHash,
        }));

        // Format invoices with overdue detection
        const now = new Date();
        const formattedInvoices = pendingInvoices.map((inv: {
            id: string;
            invoiceNumber: string;
            customerName: string;
            amount: unknown;
            currency: string;
            dueDate: Date | null;
            status: string;
        }) => {
            const isOverdue = inv.dueDate && new Date(inv.dueDate) < now && inv.status === 'sent';
            return {
                id: inv.id,
                number: inv.invoiceNumber,
                customer: inv.customerName,
                amount: Number(inv.amount),
                currency: inv.currency,
                dueDate: inv.dueDate,
                status: isOverdue ? 'overdue' : inv.status,
            };
        });

        return NextResponse.json({
            transactions: formattedTransactions,
            pendingInvoices: formattedInvoices,
        });
    } catch (error) {
        console.error("[DASHBOARD_RECENT_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
