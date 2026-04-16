/**
 * Email Digest Job
 * 
 * This service generates and sends weekly/monthly digest emails to merchants
 * summarizing their payment activity, invoices, and key metrics.
 * 
 * Can be triggered by:
 * - Vercel Cron Jobs
 * - External scheduler (e.g., AWS EventBridge)
 * - Manual API call
 */

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { subDays, subWeeks, subMonths, startOfDay, endOfDay, format } from "date-fns";

interface DigestMetrics {
    totalRevenue: number;
    transactionCount: number;
    invoicesSent: number;
    invoicesPaid: number;
    topCurrency: string;
    revenueChange: number; // Percentage change from previous period
}

interface DigestRecipient {
    userId: string;
    email: string;
    name: string | null;
    businessId: string;
    businessName: string;
    frequency: string;
}

/**
 * Get users who should receive a digest based on their preferences
 */
export async function getDigestRecipients(frequency: "daily" | "weekly" | "monthly"): Promise<DigestRecipient[]> {
    const users = await db.user.findMany({
        where: {
            business: { isNot: null },
        },
        include: {
            business: true,
        },
    });

    // Get notification preferences for these users
    const userPrefs = await db.notificationPreferences.findMany({
        where: {
            userId: { in: users.map(u => u.id) },
            weeklyDigest: true,
            digestFrequency: frequency,
        },
    });

    const prefsMap = new Map(userPrefs.map(p => [p.userId, p]));

    return users
        .filter(u => {
            const prefs = prefsMap.get(u.id);
            // Include if no preferences (default is enabled) or if explicitly enabled
            return !prefs || (prefs.weeklyDigest && prefs.digestFrequency === frequency);
        })
        .filter(u => u.email && u.businessId && u.business)
        .map(u => ({
            userId: u.id,
            email: u.email!,
            name: u.name,
            businessId: u.businessId!,
            businessName: u.business!.name || "Your Business",
            frequency,
        }));
}

/**
 * Calculate digest metrics for a business over a time period
 */
export async function calculateDigestMetrics(
    businessId: string,
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date
): Promise<DigestMetrics> {
    // Get current period transactions
    const currentTransactions = await db.transaction.findMany({
        where: {
            businessId,
            type: "inflow",
            status: { in: ["confirmed", "settled"] },
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Get previous period transactions for comparison
    const previousTransactions = await db.transaction.findMany({
        where: {
            businessId,
            type: "inflow",
            status: { in: ["confirmed", "settled"] },
            createdAt: {
                gte: previousStartDate,
                lte: previousEndDate,
            },
        },
    });

    // Get invoices
    const invoices = await db.invoice.findMany({
        where: {
            businessId,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    });

    // Calculate metrics
    const totalRevenue = currentTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0
    );
    const previousRevenue = previousTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0
    );

    // Calculate currency breakdown
    const currencyBreakdown: Record<string, number> = {};
    for (const tx of currentTransactions) {
        const currency = tx.currency || "USDC";
        currencyBreakdown[currency] = (currencyBreakdown[currency] || 0) + Number(tx.amount);
    }

    const topCurrency = Object.entries(currencyBreakdown)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "USDC";

    const revenueChange = previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0 ? 100 : 0;

    return {
        totalRevenue,
        transactionCount: currentTransactions.length,
        invoicesSent: invoices.length,
        invoicesPaid: invoices.filter(i => i.status === "paid").length,
        topCurrency,
        revenueChange,
    };
}

/**
 * Generate and send digest emails for a specific frequency
 */
export async function sendDigestEmails(frequency: "daily" | "weekly" | "monthly"): Promise<{
    sent: number;
    failed: number;
    errors: string[];
}> {
    const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
    };

    // Calculate date ranges based on frequency
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (frequency) {
        case "daily":
            endDate = endOfDay(subDays(now, 1)); // Yesterday
            startDate = startOfDay(subDays(now, 1));
            previousEndDate = endOfDay(subDays(now, 2));
            previousStartDate = startOfDay(subDays(now, 2));
            break;
        case "weekly":
            endDate = endOfDay(subDays(now, 1)); // Up to yesterday
            startDate = startOfDay(subWeeks(now, 1));
            previousEndDate = startOfDay(subWeeks(now, 1));
            previousStartDate = startOfDay(subWeeks(now, 2));
            break;
        case "monthly":
            endDate = endOfDay(subDays(now, 1));
            startDate = startOfDay(subMonths(now, 1));
            previousEndDate = startOfDay(subMonths(now, 1));
            previousStartDate = startOfDay(subMonths(now, 2));
            break;
    }

    // Get recipients
    const recipients = await getDigestRecipients(frequency);
    console.log(`[Digest] Sending ${frequency} digest to ${recipients.length} recipients`);

    for (const recipient of recipients) {
        try {
            // Calculate metrics for this business
            const metrics = await calculateDigestMetrics(
                recipient.businessId,
                startDate,
                endDate,
                previousStartDate,
                previousEndDate
            );

            // Skip if no activity
            if (metrics.transactionCount === 0 && metrics.invoicesSent === 0) {
                continue;
            }

            // Send digest email
            const result = await sendEmail(
                "digest",
                { email: recipient.email, name: recipient.name || undefined },
                {
                    businessName: recipient.businessName,
                    periodStart: format(startDate, "MMM d, yyyy"),
                    periodEnd: format(endDate, "MMM d, yyyy"),
                    totalRevenue: metrics.totalRevenue.toLocaleString(),
                    transactionCount: metrics.transactionCount.toString(),
                    invoicesSent: metrics.invoicesSent.toString(),
                    invoicesPaid: metrics.invoicesPaid.toString(),
                    topCurrency: metrics.topCurrency,
                    revenueChange: metrics.revenueChange.toFixed(1),
                    isPositiveChange: metrics.revenueChange >= 0,
                }
            );

            if (result.success) {
                results.sent++;
            } else {
                results.failed++;
                results.errors.push(`Failed to send to ${recipient.email}: ${result.error}`);
            }
        } catch (error) {
            results.failed++;
            results.errors.push(
                `Error processing ${recipient.email}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    console.log(`[Digest] Complete: ${results.sent} sent, ${results.failed} failed`);
    return results;
}

/**
 * API endpoint handler for cron job
 */
export async function runDigestJob(frequency: "daily" | "weekly" | "monthly") {
    console.log(`[Digest] Starting ${frequency} digest job at ${new Date().toISOString()}`);

    try {
        const results = await sendDigestEmails(frequency);
        return {
            success: true,
            results,
        };
    } catch (error) {
        console.error("[Digest] Job failed:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
