import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

/**
 * GET /api/analytics - Get comprehensive analytics data
 * 
 * Query params:
 * - range: "7d" | "30d" | "90d" | "1y" (default: "30d")
 */
export async function GET(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const range = searchParams.get("range") || "30d";

        // Calculate date range
        const now = new Date();
        let startDate: Date;
        let previousStartDate: Date;
        let previousEndDate: Date;

        switch (range) {
            case "7d":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                previousEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "90d":
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                previousEndDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case "1y":
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                previousStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
                previousEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            case "30d":
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                previousEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
        }

        // ===========================
        // KEY METRICS
        // ===========================

        // Total Revenue (current period)
        const currentRevenue = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: "inflow",
                status: { in: ["settled", "confirmed"] },
                createdAt: { gte: startDate },
            },
            _sum: { amount: true },
        });

        // Total Revenue (previous period - for comparison)
        const previousRevenue = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: "inflow",
                status: { in: ["settled", "confirmed"] },
                createdAt: { gte: previousStartDate, lt: previousEndDate },
            },
            _sum: { amount: true },
        });

        // Total Expenses (current period)
        const currentExpenses = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: "outflow",
                status: { in: ["settled", "confirmed"] },
                createdAt: { gte: startDate },
            },
            _sum: { amount: true },
        });

        // Total Expenses (previous period)
        const previousExpenses = await db.transaction.aggregate({
            where: {
                businessId: authUser.businessId,
                type: "outflow",
                status: { in: ["settled", "confirmed"] },
                createdAt: { gte: previousStartDate, lt: previousEndDate },
            },
            _sum: { amount: true },
        });

        // Invoice stats
        const invoicesSent = await db.invoice.count({
            where: {
                businessId: authUser.businessId,
                createdAt: { gte: startDate },
            },
        });

        const invoicesPaid = await db.invoice.count({
            where: {
                businessId: authUser.businessId,
                status: "paid",
                createdAt: { gte: startDate },
            },
        });

        // Payment link stats
        const paymentLinks = await db.paymentLink.findMany({
            where: {
                businessId: authUser.businessId,
                createdAt: { gte: startDate },
            },
            select: {
                id: true,
                usedCount: true,
                _count: {
                    select: { transactions: true },
                },
            },
        });

        const totalLinkUses = paymentLinks.reduce((acc: number, link: { usedCount: number }) => acc + link.usedCount, 0);
        const linksWithConversions = paymentLinks.filter((link: { usedCount: number }) => link.usedCount > 0).length;
        const conversionRate = paymentLinks.length > 0
            ? Math.round((linksWithConversions / paymentLinks.length) * 100)
            : 0;

        // Calculate changes
        const currentRevenueVal = Number(currentRevenue._sum.amount || 0);
        const previousRevenueVal = Number(previousRevenue._sum.amount || 0);
        const currentExpensesVal = Number(currentExpenses._sum.amount || 0);
        const previousExpensesVal = Number(previousExpenses._sum.amount || 0);

        const revenueChange = previousRevenueVal > 0
            ? ((currentRevenueVal - previousRevenueVal) / previousRevenueVal) * 100
            : currentRevenueVal > 0 ? 100 : 0;

        const expensesChange = previousExpensesVal > 0
            ? ((currentExpensesVal - previousExpensesVal) / previousExpensesVal) * 100
            : currentExpensesVal > 0 ? 100 : 0;

        // ===========================
        // MONTHLY DATA (for chart)
        // ===========================

        // Get transactions grouped by month
        const transactions = await db.transaction.findMany({
            where: {
                businessId: authUser.businessId,
                status: { in: ["settled", "confirmed"] },
                createdAt: { gte: startDate },
            },
            select: {
                type: true,
                amount: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });

        // Group by month
        const monthlyMap = new Map<string, { inflow: number; outflow: number }>();

        transactions.forEach((tx: { type: string; amount: unknown; createdAt: Date }) => {
            const monthKey = tx.createdAt.toLocaleString("en-US", { month: "short", year: "2-digit" });
            const existing = monthlyMap.get(monthKey) || { inflow: 0, outflow: 0 };

            if (tx.type === "inflow") {
                existing.inflow += Number(tx.amount);
            } else {
                existing.outflow += Number(tx.amount);
            }

            monthlyMap.set(monthKey, existing);
        });

        // Convert to array, fill in missing months
        const monthlyData: { month: string; inflow: number; outflow: number }[] = [];
        const months = getMonthsInRange(startDate, now);

        months.forEach((month: string) => {
            const data = monthlyMap.get(month) || { inflow: 0, outflow: 0 };
            monthlyData.push({
                month: month.split(" ")[0], // Just the month abbrev
                inflow: Math.round(data.inflow * 100) / 100,
                outflow: Math.round(data.outflow * 100) / 100,
            });
        });

        // ===========================
        // TOP PAYMENT LINKS
        // ===========================

        const topPaymentLinks = await db.paymentLink.findMany({
            where: {
                businessId: authUser.businessId,
                usedCount: { gt: 0 },
            },
            select: {
                id: true,
                shortCode: true,
                usedCount: true,
                amount: true,
                currency: true,
                transactions: {
                    where: {
                        status: { in: ["settled", "confirmed"] },
                    },
                    select: {
                        amount: true,
                    },
                },
            },
            orderBy: { usedCount: "desc" },
            take: 5,
        });

        const topLinks = topPaymentLinks.map((link: { shortCode: string | null; usedCount: number; transactions: { amount: unknown }[] }) => ({
            name: link.shortCode || "Unnamed Link",
            value: link.transactions.reduce((acc: number, tx: { amount: unknown }) => acc + Number(tx.amount), 0),
            secondary: `${link.usedCount} uses`,
        }));

        // ===========================
        // TOP CLIENTS (by wallet address)
        // ===========================

        const clientTransactions = await db.transaction.groupBy({
            by: ["payerAddress"],
            where: {
                businessId: authUser.businessId,
                type: "inflow",
                status: { in: ["settled", "confirmed"] },
                payerAddress: { not: null },
                createdAt: { gte: startDate },
            },
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: "desc" } },
            take: 5,
        });

        const topClients = clientTransactions.map((client: { payerAddress: string | null; _sum: { amount: unknown }; _count: { id: number } }) => ({
            name: truncateAddress(client.payerAddress || "Unknown"),
            fullAddress: client.payerAddress,
            value: Number(client._sum.amount || 0),
            secondary: `${client._count.id} transaction${client._count.id !== 1 ? "s" : ""}`,
        }));

        // ===========================
        // CURRENCY BREAKDOWN
        // ===========================

        const currencyBreakdown = await db.transaction.groupBy({
            by: ["currency"],
            where: {
                businessId: authUser.businessId,
                type: "inflow",
                status: { in: ["settled", "confirmed"] },
                createdAt: { gte: startDate },
            },
            _sum: { amount: true },
        });

        const totalByCurrentRevenue = currencyBreakdown.reduce(
            (acc: number, c: { currency: string; _sum: { amount: unknown } }) => acc + Number(c._sum.amount || 0),
            0
        );

        const currencyColors: Record<string, string> = {
            USDC: "from-blue-500 to-cyan-500",
            EURC: "from-purple-500 to-pink-500",
            XSGD: "from-emerald-500 to-teal-500",
            USDT: "from-green-500 to-emerald-500",
            DAI: "from-amber-500 to-yellow-500",
        };

        const currencies = currencyBreakdown.map((c: { currency: string; _sum: { amount: unknown } }) => ({
            currency: c.currency,
            amount: Number(c._sum.amount || 0),
            percentage: totalByCurrentRevenue > 0
                ? Math.round((Number(c._sum.amount || 0) / totalByCurrentRevenue) * 100)
                : 0,
            color: currencyColors[c.currency] || "from-zinc-500 to-zinc-400",
        }));

        // If no currencies, add a placeholder
        if (currencies.length === 0) {
            currencies.push({
                currency: "USDC",
                amount: 0,
                percentage: 100,
                color: currencyColors.USDC,
            });
        }

        return NextResponse.json({
            metrics: {
                totalRevenue: currentRevenueVal,
                totalExpenses: currentExpensesVal,
                invoicesSent,
                invoicesPaid,
                linkConversions: totalLinkUses,
                conversionRate,
                revenueChange: Math.round(revenueChange * 10) / 10,
                expensesChange: Math.round(expensesChange * 10) / 10,
            },
            monthlyData,
            topLinks,
            topClients,
            currencyBreakdown: currencies,
            period: {
                start: startDate.toISOString(),
                end: now.toISOString(),
                range,
            },
        });
    } catch (error) {
        console.error("[ANALYTICS_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}

/**
 * Helper: Get array of month labels for a date range
 */
function getMonthsInRange(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
        months.push(current.toLocaleString("en-US", { month: "short", year: "2-digit" }));
        current.setMonth(current.getMonth() + 1);
    }

    return months;
}

/**
 * Helper: Truncate wallet address for display
 */
function truncateAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
