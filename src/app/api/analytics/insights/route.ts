import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

/**
 * GET /api/analytics/insights - Get actionable business insights
 * 
 * Provides intelligent insights based on business data patterns
 */
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Fetch base data
        const [
            recentRevenue,
            previousRevenue,
            unpaidInvoices,
            overdueInvoices,
            unusedPaymentLinks,
            topPayingCustomer,
            averageTransactionValue,
            transactionCount,
        ] = await Promise.all([
            // Recent 30 days revenue
            db.transaction.aggregate({
                where: {
                    businessId: authUser.businessId,
                    type: "inflow",
                    status: { in: ["settled", "confirmed"] },
                    createdAt: { gte: thirtyDaysAgo },
                },
                _sum: { amount: true },
            }),
            // Previous 30 days revenue
            db.transaction.aggregate({
                where: {
                    businessId: authUser.businessId,
                    type: "inflow",
                    status: { in: ["settled", "confirmed"] },
                    createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
                },
                _sum: { amount: true },
            }),
            // Unpaid invoices
            db.invoice.count({
                where: {
                    businessId: authUser.businessId,
                    status: { in: ["draft", "sent"] },
                },
            }),
            // Overdue invoices
            db.invoice.count({
                where: {
                    businessId: authUser.businessId,
                    status: { in: ["draft", "sent"] },
                    dueDate: { lt: now },
                },
            }),
            // Unused payment links (created but never used)
            db.paymentLink.count({
                where: {
                    businessId: authUser.businessId,
                    usedCount: 0,
                    status: "active",
                },
            }),
            // Top paying customer
            db.transaction.groupBy({
                by: ["payerAddress"],
                where: {
                    businessId: authUser.businessId,
                    type: "inflow",
                    status: { in: ["settled", "confirmed"] },
                    payerAddress: { not: null },
                },
                _sum: { amount: true },
                orderBy: { _sum: { amount: "desc" } },
                take: 1,
            }),
            // Average transaction value
            db.transaction.aggregate({
                where: {
                    businessId: authUser.businessId,
                    type: "inflow",
                    status: { in: ["settled", "confirmed"] },
                },
                _avg: { amount: true },
            }),
            // Total transaction count
            db.transaction.count({
                where: {
                    businessId: authUser.businessId,
                    type: "inflow",
                    status: { in: ["settled", "confirmed"] },
                },
            }),
        ]);

        const recentValue = Number(recentRevenue._sum.amount || 0);
        const previousValue = Number(previousRevenue._sum.amount || 0);
        const growthRate = previousValue > 0 
            ? ((recentValue - previousValue) / previousValue) * 100 
            : recentValue > 0 ? 100 : 0;

        // Generate insights
        const insights: Array<{
            type: "success" | "warning" | "info" | "tip";
            title: string;
            message: string;
            action?: { label: string; href: string };
        }> = [];

        // Growth insights
        if (growthRate > 20) {
            insights.push({
                type: "success",
                title: "Strong Growth! 🚀",
                message: `Your revenue grew ${growthRate.toFixed(1)}% compared to the previous period. Keep up the great work!`,
            });
        } else if (growthRate < -10) {
            insights.push({
                type: "warning",
                title: "Revenue Decline",
                message: `Your revenue decreased ${Math.abs(growthRate).toFixed(1)}% compared to the previous period. Consider reaching out to existing customers or launching promotions.`,
                action: { label: "Create Payment Link", href: "/dashboard/payments" },
            });
        }

        // Overdue invoices
        if (overdueInvoices > 0) {
            insights.push({
                type: "warning",
                title: "Overdue Invoices",
                message: `You have ${overdueInvoices} overdue invoice${overdueInvoices !== 1 ? "s" : ""}. Consider sending payment reminders.`,
                action: { label: "View Invoices", href: "/dashboard/invoices" },
            });
        }

        // Unpaid invoices
        if (unpaidInvoices > 3) {
            insights.push({
                type: "info",
                title: "Pending Payments",
                message: `${unpaidInvoices} invoices are awaiting payment. You could convert ${Math.round(unpaidInvoices * 0.3)} of these with follow-up emails.`,
                action: { label: "Manage Invoices", href: "/dashboard/invoices" },
            });
        }

        // Unused payment links
        if (unusedPaymentLinks > 0) {
            insights.push({
                type: "tip",
                title: "Unused Payment Links",
                message: `${unusedPaymentLinks} payment link${unusedPaymentLinks !== 1 ? "s have" : " has"} never been used. Consider promoting them or archiving if not needed.`,
                action: { label: "View Links", href: "/dashboard/payments" },
            });
        }

        // Average transaction value
        const avgValue = Number(averageTransactionValue._avg.amount || 0);
        if (avgValue > 0 && transactionCount >= 5) {
            insights.push({
                type: "info",
                title: "Transaction Insights",
                message: `Your average transaction is $${avgValue.toFixed(2)}. ${avgValue > 100 ? "You're attracting high-value payments!" : "Consider offering premium tiers to increase average order value."}`,
            });
        }

        // Top customer insight
        if (topPayingCustomer.length > 0) {
            const topValue = Number(topPayingCustomer[0]._sum.amount || 0);
            const percentage = recentValue > 0 ? (topValue / recentValue) * 100 : 0;
            
            if (percentage > 50) {
                insights.push({
                    type: "warning",
                    title: "Revenue Concentration",
                    message: `${percentage.toFixed(0)}% of your revenue comes from one customer. Consider diversifying your customer base to reduce risk.`,
                });
            }
        }

        // First-time tips
        if (transactionCount === 0) {
            insights.push({
                type: "tip",
                title: "Get Started",
                message: "Create your first payment link or invoice to start accepting payments!",
                action: { label: "Create Invoice", href: "/dashboard/invoices" },
            });
        }

        // Summary stats for the response
        const summary = {
            recentRevenue: recentValue,
            previousRevenue: previousValue,
            growthRate: Math.round(growthRate * 10) / 10,
            unpaidInvoices,
            overdueInvoices,
            unusedPaymentLinks,
            averageTransactionValue: Math.round(avgValue * 100) / 100,
            totalTransactions: transactionCount,
        };

        return NextResponse.json({
            insights,
            summary,
            generatedAt: now.toISOString(),
        });
    } catch (error) {
        console.error("[ANALYTICS_INSIGHTS_GET]", error);
        return NextResponse.json(
            { error: "Failed to generate insights" },
            { status: 500 }
        );
    }
}
