/**
 * Goal Progress Service
 * 
 * Automatically tracks and updates goal progress when relevant events occur:
 * - Revenue goals: Updated on payment received
 * - Invoice goals: Updated on invoice created/sent
 * - Payment link goals: Updated on payment link created
 * - Team goals: Updated on team member added
 */

import { db } from "@/lib/db";
import { addPoints } from "./achievement-service";
import { createNotification } from "@/lib/notifications";

// ============================================================================
// Types
// ============================================================================

export type GoalType = "revenue" | "invoices" | "payment_links" | "team";

export interface GoalUpdateResult {
    goalsUpdated: number;
    goalsAchieved: string[]; // IDs of newly achieved goals
}

// ============================================================================
// Goal Progress Tracking
// ============================================================================

/**
 * Update revenue goals when a payment is received
 */
export async function updateRevenueGoals(
    userId: string,
    paymentAmount: number
): Promise<GoalUpdateResult> {
    return updateGoalsByType(userId, "revenue", paymentAmount);
}

/**
 * Update invoice goals when an invoice is created or sent
 */
export async function updateInvoiceGoals(userId: string): Promise<GoalUpdateResult> {
    return updateGoalsByType(userId, "invoices", 1);
}

/**
 * Update payment link goals when a payment link is created
 */
export async function updatePaymentLinkGoals(userId: string): Promise<GoalUpdateResult> {
    return updateGoalsByType(userId, "payment_links", 1);
}

/**
 * Update team goals when a team member is added
 */
export async function updateTeamGoals(userId: string): Promise<GoalUpdateResult> {
    return updateGoalsByType(userId, "team", 1);
}

/**
 * Generic function to update goals by type
 */
async function updateGoalsByType(
    userId: string,
    goalType: GoalType,
    incrementValue: number
): Promise<GoalUpdateResult> {
    try {
        // Get all active (unachieved) goals of this type for the user
        const activeGoals = await db.goal.findMany({
            where: {
                userId,
                type: goalType,
                achieved: false,
                deadline: { gte: new Date() }, // Only goals that haven't expired
            },
        });

        if (activeGoals.length === 0) {
            return { goalsUpdated: 0, goalsAchieved: [] };
        }

        const achievedGoalIds: string[] = [];

        // Update each goal
        for (const goal of activeGoals) {
            const newValue = Number(goal.currentValue) + incrementValue;
            const targetValue = Number(goal.targetValue);
            const isAchieved = newValue >= targetValue;

            await db.goal.update({
                where: { id: goal.id },
                data: {
                    currentValue: newValue,
                    achieved: isAchieved,
                    achievedAt: isAchieved ? new Date() : null,
                },
            });

            if (isAchieved) {
                achievedGoalIds.push(goal.id);

                // Award points for achieving the goal
                await addPoints(userId, 100, "goal_achieved", {
                    goalId: goal.id,
                    goalTitle: goal.title,
                    goalType: goal.type,
                });

                // Create notification
                await createNotification({
                    userId,
                    type: "goal_achieved",
                    title: "🎯 Goal Achieved!",
                    message: `Congratulations! You've achieved your goal: "${goal.title}"`,
                    metadata: {
                        goalId: goal.id,
                        goalType: goal.type,
                        targetValue: targetValue,
                    },
                });
            }
        }

        return {
            goalsUpdated: activeGoals.length,
            goalsAchieved: achievedGoalIds,
        };
    } catch (error) {
        console.error(`[GOAL-SERVICE] Failed to update ${goalType} goals for ${userId}:`, error);
        return { goalsUpdated: 0, goalsAchieved: [] };
    }
}

/**
 * Recalculate all goal progress for a user
 * Useful when syncing data or after bulk operations
 */
export async function recalculateAllGoals(userId: string): Promise<GoalUpdateResult> {
    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: {
                business: {
                    include: {
                        transactions: {
                            where: {
                                type: "inflow",
                                status: { in: ["confirmed", "settled"] },
                            },
                        },
                        invoices: true,
                        paymentLinks: true,
                        teamMembers: true,
                    },
                },
            },
        });

        if (!user?.business) {
            return { goalsUpdated: 0, goalsAchieved: [] };
        }

        const business = user.business;

        // Calculate current values
        const totalRevenue = business.transactions.reduce(
            (sum, tx) => sum + Number(tx.amount),
            0
        );
        const totalInvoices = business.invoices.length;
        const totalPaymentLinks = business.paymentLinks.length;
        const totalTeamMembers = business.teamMembers.length;

        // Get all active goals
        const activeGoals = await db.goal.findMany({
            where: {
                userId,
                achieved: false,
            },
        });

        const achievedGoalIds: string[] = [];

        for (const goal of activeGoals) {
            let currentValue = 0;

            switch (goal.type) {
                case "revenue":
                    currentValue = totalRevenue;
                    break;
                case "invoices":
                    currentValue = totalInvoices;
                    break;
                case "payment_links":
                    currentValue = totalPaymentLinks;
                    break;
                case "team":
                    currentValue = totalTeamMembers;
                    break;
            }

            const targetValue = Number(goal.targetValue);
            const isAchieved = currentValue >= targetValue;

            await db.goal.update({
                where: { id: goal.id },
                data: {
                    currentValue,
                    achieved: isAchieved,
                    achievedAt: isAchieved ? new Date() : null,
                },
            });

            if (isAchieved) {
                achievedGoalIds.push(goal.id);

                // Award points
                await addPoints(userId, 100, "goal_achieved", {
                    goalId: goal.id,
                    goalTitle: goal.title,
                    goalType: goal.type,
                });

                // Create notification
                await createNotification({
                    userId,
                    type: "goal_achieved",
                    title: "🎯 Goal Achieved!",
                    message: `Congratulations! You've achieved your goal: "${goal.title}"`,
                    metadata: {
                        goalId: goal.id,
                        goalType: goal.type,
                        targetValue: targetValue,
                    },
                });
            }
        }

        return {
            goalsUpdated: activeGoals.length,
            goalsAchieved: achievedGoalIds,
        };
    } catch (error) {
        console.error(`[GOAL-SERVICE] Failed to recalculate goals for ${userId}:`, error);
        return { goalsUpdated: 0, goalsAchieved: [] };
    }
}

/**
 * Check and expire overdue goals
 * Should be called periodically (e.g., daily cron job)
 */
export async function expireOverdueGoals(): Promise<number> {
    try {
        const result = await db.goal.updateMany({
            where: {
                achieved: false,
                deadline: { lt: new Date() },
            },
            data: {
                // We don't delete, just mark as expired by leaving achieved: false
                // The UI can filter these out
            },
        });

        return result.count;
    } catch (error) {
        console.error("[GOAL-SERVICE] Failed to expire overdue goals:", error);
        return 0;
    }
}

/**
 * Get user's goal statistics
 */
export async function getGoalStats(userId: string) {
    const [total, achieved, active, expired] = await Promise.all([
        db.goal.count({ where: { userId } }),
        db.goal.count({ where: { userId, achieved: true } }),
        db.goal.count({
            where: { userId, achieved: false, deadline: { gte: new Date() } },
        }),
        db.goal.count({
            where: { userId, achieved: false, deadline: { lt: new Date() } },
        }),
    ]);

    return {
        total,
        achieved,
        active,
        expired,
        achievementRate: total > 0 ? Math.round((achieved / total) * 100) : 0,
    };
}
