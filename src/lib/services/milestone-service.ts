/**
 * Milestone Service
 * 
 * Tracks and rewards major merchant milestones:
 * - 100 transactions → Fee discount (5% off platform fees)
 * - $10k monthly volume → Featured merchant status
 * - Additional milestones for engagement and growth
 */

import { db } from "@/lib/db";
import { addPoints } from "./achievement-service";
import { createNotification } from "@/lib/notifications";

// ============================================================================
// Types
// ============================================================================

export interface Milestone {
    id: string;
    name: string;
    description: string;
    type: "transactions" | "volume" | "revenue" | "streak";
    threshold: number;
    reward: MilestoneReward;
    icon: string;
}

export interface MilestoneReward {
    type: "fee_discount" | "featured_merchant" | "priority_support" | "custom_branding";
    value: number; // Percentage for discounts, days for time-limited benefits
    durationDays?: number; // null means permanent
    description: string;
}

export interface AchievedMilestone {
    milestoneId: string;
    userId: string;
    businessId: string;
    achievedAt: Date;
    reward: MilestoneReward;
    expiresAt?: Date;
}

// ============================================================================
// Milestone Definitions
// ============================================================================

export const MILESTONES: Milestone[] = [
    {
        id: "tx_100_fee_discount",
        name: "Century Club",
        description: "Complete 100 transactions",
        type: "transactions",
        threshold: 100,
        reward: {
            type: "fee_discount",
            value: 5, // 5% discount
            durationDays: 90, // 90 days of discount
            description: "5% off platform fees for 90 days",
        },
        icon: "💯",
    },
    {
        id: "tx_500_fee_discount",
        name: "Transaction Titan",
        description: "Complete 500 transactions",
        type: "transactions",
        threshold: 500,
        reward: {
            type: "fee_discount",
            value: 10, // 10% discount
            durationDays: 180, // 180 days
            description: "10% off platform fees for 180 days",
        },
        icon: "🏆",
    },
    {
        id: "tx_1000_fee_discount",
        name: "Transaction Legend",
        description: "Complete 1,000 transactions",
        type: "transactions",
        threshold: 1000,
        reward: {
            type: "fee_discount",
            value: 15, // 15% discount
            description: "15% off platform fees permanently",
        },
        icon: "👑",
    },
    {
        id: "volume_10k_featured",
        name: "Rising Star",
        description: "Reach $10,000 monthly volume",
        type: "volume",
        threshold: 10000,
        reward: {
            type: "featured_merchant",
            value: 1, // Featured status level 1
            durationDays: 30, // Featured for 30 days
            description: "Featured merchant status for 30 days",
        },
        icon: "⭐",
    },
    {
        id: "volume_50k_featured",
        name: "Superstar Merchant",
        description: "Reach $50,000 monthly volume",
        type: "volume",
        threshold: 50000,
        reward: {
            type: "featured_merchant",
            value: 2, // Featured status level 2
            durationDays: 60,
            description: "Premium featured merchant status for 60 days",
        },
        icon: "🌟",
    },
    {
        id: "volume_100k_featured",
        name: "Elite Merchant",
        description: "Reach $100,000 monthly volume",
        type: "volume",
        threshold: 100000,
        reward: {
            type: "featured_merchant",
            value: 3, // Permanent featured
            description: "Permanent elite featured merchant status",
        },
        icon: "💎",
    },
    {
        id: "streak_30_priority",
        name: "Consistency Champion",
        description: "Maintain a 30-day activity streak",
        type: "streak",
        threshold: 30,
        reward: {
            type: "priority_support",
            value: 1,
            durationDays: 30,
            description: "Priority support for 30 days",
        },
        icon: "🔥",
    },
];

// ============================================================================
// Milestone Tracking Functions
// ============================================================================

/**
 * Check transaction milestones after a transaction is completed
 */
export async function checkTransactionMilestones(
    userId: string,
    businessId: string
): Promise<Milestone[]> {
    try {
        // Get total transaction count
        const transactionCount = await db.transaction.count({
            where: {
                businessId,
                type: "inflow",
                status: { in: ["confirmed", "settled"] },
            },
        });

        // Get already achieved milestones
        const achievedMilestones = await getAchievedMilestones(userId, "transactions");
        const achievedIds = new Set(achievedMilestones.map((m) => m.milestoneId));

        // Check which new milestones have been reached
        const newlyAchieved: Milestone[] = [];

        for (const milestone of MILESTONES.filter((m) => m.type === "transactions")) {
            if (!achievedIds.has(milestone.id) && transactionCount >= milestone.threshold) {
                await awardMilestone(userId, businessId, milestone);
                newlyAchieved.push(milestone);
            }
        }

        return newlyAchieved;
    } catch (error) {
        console.error("[MILESTONE-SERVICE] Failed to check transaction milestones:", error);
        return [];
    }
}

/**
 * Check monthly volume milestones
 */
export async function checkVolumeMilestones(
    userId: string,
    businessId: string
): Promise<Milestone[]> {
    try {
        // Get current month's volume
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const transactions = await db.transaction.findMany({
            where: {
                businessId,
                type: "inflow",
                status: { in: ["confirmed", "settled"] },
                createdAt: { gte: startOfMonth },
            },
            select: { amount: true },
        });

        const monthlyVolume = transactions.reduce(
            (sum, tx) => sum + Number(tx.amount),
            0
        );

        // Get already achieved milestones (only this month)
        const achievedMilestones = await getAchievedMilestones(userId, "volume", startOfMonth);
        const achievedIds = new Set(achievedMilestones.map((m) => m.milestoneId));

        // Check which new milestones have been reached
        const newlyAchieved: Milestone[] = [];

        for (const milestone of MILESTONES.filter((m) => m.type === "volume")) {
            if (!achievedIds.has(milestone.id) && monthlyVolume >= milestone.threshold) {
                await awardMilestone(userId, businessId, milestone);
                newlyAchieved.push(milestone);
            }
        }

        return newlyAchieved;
    } catch (error) {
        console.error("[MILESTONE-SERVICE] Failed to check volume milestones:", error);
        return [];
    }
}

/**
 * Check streak milestones
 */
export async function checkStreakMilestones(
    userId: string,
    businessId: string,
    currentStreak: number
): Promise<Milestone[]> {
    try {
        const achievedMilestones = await getAchievedMilestones(userId, "streak");
        const achievedIds = new Set(achievedMilestones.map((m) => m.milestoneId));

        const newlyAchieved: Milestone[] = [];

        for (const milestone of MILESTONES.filter((m) => m.type === "streak")) {
            if (!achievedIds.has(milestone.id) && currentStreak >= milestone.threshold) {
                await awardMilestone(userId, businessId, milestone);
                newlyAchieved.push(milestone);
            }
        }

        return newlyAchieved;
    } catch (error) {
        console.error("[MILESTONE-SERVICE] Failed to check streak milestones:", error);
        return [];
    }
}

// ============================================================================
// Milestone Awarding
// ============================================================================

/**
 * Award a milestone to a user
 */
async function awardMilestone(
    userId: string,
    businessId: string,
    milestone: Milestone
): Promise<void> {
    try {
        const expiresAt = milestone.reward.durationDays
            ? new Date(Date.now() + milestone.reward.durationDays * 24 * 60 * 60 * 1000)
            : null;

        // Store milestone achievement
        await db.milestoneAchievement.create({
            data: {
                milestoneId: milestone.id,
                userId,
                businessId,
                rewardType: milestone.reward.type,
                rewardValue: milestone.reward.value,
                expiresAt,
                metadata: {
                    milestoneName: milestone.name,
                    description: milestone.reward.description,
                },
            },
        });

        // Apply the reward based on type
        await applyMilestoneReward(userId, businessId, milestone);

        // Award bonus points
        const pointsForMilestone = getPointsForMilestone(milestone);
        await addPoints(userId, pointsForMilestone, "milestone_achieved", {
            milestoneId: milestone.id,
            milestoneName: milestone.name,
        });

        // Create celebration notification
        await createNotification({
            userId,
            type: "milestone_reached",
            title: `${milestone.icon} Milestone Unlocked: ${milestone.name}!`,
            message: `You've earned: ${milestone.reward.description}`,
            metadata: {
                milestoneId: milestone.id,
                rewardType: milestone.reward.type,
                rewardValue: milestone.reward.value,
                expiresAt: expiresAt?.toISOString(),
            },
        });

        console.log(
            `[MILESTONE-SERVICE] Awarded milestone "${milestone.name}" to user ${userId}`
        );
    } catch (error) {
        console.error(`[MILESTONE-SERVICE] Failed to award milestone ${milestone.id}:`, error);
        throw error;
    }
}

/**
 * Apply the milestone reward to the business
 */
async function applyMilestoneReward(
    userId: string,
    businessId: string,
    milestone: Milestone
): Promise<void> {
    const { reward } = milestone;

    switch (reward.type) {
        case "fee_discount":
            await db.business.update({
                where: { id: businessId },
                data: {
                    feeDiscountPercent: reward.value,
                    feeDiscountExpiresAt: reward.durationDays
                        ? new Date(Date.now() + reward.durationDays * 24 * 60 * 60 * 1000)
                        : null,
                },
            });
            break;

        case "featured_merchant":
            await db.business.update({
                where: { id: businessId },
                data: {
                    isFeatured: true,
                    featuredLevel: reward.value,
                    featuredExpiresAt: reward.durationDays
                        ? new Date(Date.now() + reward.durationDays * 24 * 60 * 60 * 1000)
                        : null,
                },
            });
            break;

        case "priority_support":
            await db.business.update({
                where: { id: businessId },
                data: {
                    hasPrioritySupport: true,
                    prioritySupportExpiresAt: reward.durationDays
                        ? new Date(Date.now() + reward.durationDays * 24 * 60 * 60 * 1000)
                        : null,
                },
            });
            break;

        case "custom_branding":
            // Custom branding is typically handled through tier system
            // This could unlock it for lower tiers
            break;
    }
}

/**
 * Get points awarded for achieving a milestone
 */
function getPointsForMilestone(milestone: Milestone): number {
    // Higher thresholds = more points
    if (milestone.threshold >= 1000) return 1000;
    if (milestone.threshold >= 500) return 500;
    if (milestone.threshold >= 100) return 250;
    if (milestone.threshold >= 50) return 150;
    if (milestone.threshold >= 10) return 100;
    return 50;
}

// ============================================================================
// Milestone Query Functions
// ============================================================================

/**
 * Get all milestones achieved by a user
 */
export async function getAchievedMilestones(
    userId: string,
    type?: string,
    since?: Date
): Promise<AchievedMilestone[]> {
    const where: any = { userId };

    if (type) {
        // Filter by milestone type (we need to check the milestone definition)
        const milestoneIds = MILESTONES.filter((m) => m.type === type).map((m) => m.id);
        where.milestoneId = { in: milestoneIds };
    }

    if (since) {
        where.achievedAt = { gte: since };
    }

    const achievements = await db.milestoneAchievement.findMany({
        where,
        orderBy: { achievedAt: "desc" },
    });

    return achievements.map((a) => ({
        milestoneId: a.milestoneId,
        userId: a.userId,
        businessId: a.businessId,
        achievedAt: a.achievedAt,
        reward: {
            type: a.rewardType as MilestoneReward["type"],
            value: a.rewardValue,
            description: (a.metadata as any)?.description || "",
        },
        expiresAt: a.expiresAt || undefined,
    }));
}

/**
 * Get all available milestones with progress
 */
export async function getMilestonesWithProgress(
    userId: string,
    businessId: string
): Promise<(Milestone & { current: number; achieved: boolean; achievedAt?: Date })[]> {
    // Get current stats
    const [transactionCount, monthlyVolume, currentStreak] = await Promise.all([
        db.transaction.count({
            where: {
                businessId,
                type: "inflow",
                status: { in: ["confirmed", "settled"] },
            },
        }),
        getMonthlyVolume(businessId),
        getCurrentStreak(userId),
    ]);

    // Get achieved milestones
    const achieved = await getAchievedMilestones(userId);
    const achievedMap = new Map(
        achieved.map((a) => [a.milestoneId, a.achievedAt])
    );

    return MILESTONES.map((milestone) => {
        let current = 0;

        switch (milestone.type) {
            case "transactions":
                current = transactionCount;
                break;
            case "volume":
                current = monthlyVolume;
                break;
            case "streak":
                current = currentStreak;
                break;
        }

        return {
            ...milestone,
            current,
            achieved: achievedMap.has(milestone.id),
            achievedAt: achievedMap.get(milestone.id),
        };
    });
}

/**
 * Get active (non-expired) rewards for a business
 */
export async function getActiveRewards(businessId: string): Promise<{
    feeDiscount: number;
    isFeatured: boolean;
    featuredLevel: number;
    hasPrioritySupport: boolean;
}> {
    const business = await db.business.findUnique({
        where: { id: businessId },
        select: {
            feeDiscountPercent: true,
            feeDiscountExpiresAt: true,
            isFeatured: true,
            featuredLevel: true,
            featuredExpiresAt: true,
            hasPrioritySupport: true,
            prioritySupportExpiresAt: true,
        },
    });

    if (!business) {
        return {
            feeDiscount: 0,
            isFeatured: false,
            featuredLevel: 0,
            hasPrioritySupport: false,
        };
    }

    const now = new Date();

    return {
        feeDiscount:
            !business.feeDiscountExpiresAt || business.feeDiscountExpiresAt > now
                ? business.feeDiscountPercent || 0
                : 0,
        isFeatured:
            business.isFeatured &&
            (!business.featuredExpiresAt || business.featuredExpiresAt > now),
        featuredLevel:
            business.isFeatured &&
            (!business.featuredExpiresAt || business.featuredExpiresAt > now)
                ? business.featuredLevel || 0
                : 0,
        hasPrioritySupport:
            business.hasPrioritySupport &&
            (!business.prioritySupportExpiresAt || business.prioritySupportExpiresAt > now),
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getMonthlyVolume(businessId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await db.transaction.findMany({
        where: {
            businessId,
            type: "inflow",
            status: { in: ["confirmed", "settled"] },
            createdAt: { gte: startOfMonth },
        },
        select: { amount: true },
    });

    return transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
}

async function getCurrentStreak(userId: string): Promise<number> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true },
    });

    return user?.currentStreak || 0;
}

/**
 * Expire rewards that have passed their expiration date
 * Should be called periodically (e.g., daily cron job)
 */
export async function expireRewards(): Promise<void> {
    const now = new Date();

    await db.business.updateMany({
        where: {
            feeDiscountExpiresAt: { lt: now },
            feeDiscountPercent: { gt: 0 },
        },
        data: {
            feeDiscountPercent: 0,
            feeDiscountExpiresAt: null,
        },
    });

    await db.business.updateMany({
        where: {
            featuredExpiresAt: { lt: now },
            isFeatured: true,
        },
        data: {
            isFeatured: false,
            featuredLevel: 0,
            featuredExpiresAt: null,
        },
    });

    await db.business.updateMany({
        where: {
            prioritySupportExpiresAt: { lt: now },
            hasPrioritySupport: true,
        },
        data: {
            hasPrioritySupport: false,
            prioritySupportExpiresAt: null,
        },
    });
}
