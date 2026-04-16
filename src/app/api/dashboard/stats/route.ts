import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get current month start
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // Aggregate total revenue (settled AND confirmed transactions - both are completed payments)
        const totalRevenue = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: 'inflow',
                status: { in: ['settled', 'confirmed'] },
            },
            _sum: {
                amount: true,
            },
        });

        // Pending payments = unpaid invoices (draft or sent) + unconfirmed transactions (pending status)
        const pendingInvoices = await db.invoice.aggregate({
            where: {
                businessId: authUser.businessId,
                status: { in: ['draft', 'sent'] },
            },
            _sum: {
                amount: true,
            },
        });

        // Unconfirmed transactions (payments received but not yet settled to merchant wallet)
        const pendingTransactions = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: 'inflow',
                status: 'pending',
            },
            _sum: {
                amount: true,
            },
        });

        // Combine both for total pending
        const pendingPaymentsValue = Number(pendingInvoices._sum.amount || 0) + Number(pendingTransactions._sum.amount || 0);

        // This month's revenue
        const thisMonthRevenue = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: 'inflow',
                status: { in: ['settled', 'confirmed'] },
                createdAt: {
                    gte: monthStart,
                },
            },
            _sum: {
                amount: true,
            },
        });

        // Last month's revenue (for comparison)
        const lastMonthRevenue = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: 'inflow',
                status: { in: ['settled', 'confirmed'] },
                createdAt: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd,
                },
            },
            _sum: {
                amount: true,
            },
        });

        // Total transaction count
        const transactionCount = await db.transaction.count({
            where: {
                businessId: authUser.businessId,
            },
        });

        // This month transaction count
        const thisMonthTransactionCount = await db.transaction.count({
            where: {
                businessId: authUser.businessId,
                createdAt: {
                    gte: monthStart,
                },
            },
        });

        // Last month transaction count
        const lastMonthTransactionCount = await db.transaction.count({
            where: {
                businessId: authUser.businessId,
                createdAt: {
                    gte: lastMonthStart,
                    lte: lastMonthEnd,
                },
            },
        });

        // Calculate percentage changes
        const totalRevenueValue = Number(totalRevenue._sum.amount || 0);
        const thisMonthValue = Number(thisMonthRevenue._sum.amount || 0);
        const lastMonthValue = Number(lastMonthRevenue._sum.amount || 0);

        const revenueChange = lastMonthValue > 0 
            ? ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100 
            : 0;

        const transactionChange = lastMonthTransactionCount > 0
            ? ((thisMonthTransactionCount - lastMonthTransactionCount) / lastMonthTransactionCount) * 100
            : 0;

        return NextResponse.json({
            totalRevenue: {
                value: totalRevenueValue,
                currency: 'USDC',
                change: revenueChange,
            },
            pendingPayments: {
                value: pendingPaymentsValue,
                currency: 'USDC',
                change: 0, // No comparison for pending
            },
            thisMonth: {
                value: thisMonthValue,
                currency: 'USDC',
                change: revenueChange,
            },
            transactionCount: {
                value: transactionCount,
                change: transactionChange,
            },
        });
    } catch (error) {
        console.error("[DASHBOARD_STATS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
