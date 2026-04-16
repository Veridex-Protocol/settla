import { db } from "@/lib/db";
import { AchievementType, Prisma } from "@prisma/client";

// Achievement definitions with metadata
export const ACHIEVEMENT_DEFINITIONS: Record<
  AchievementType,
  {
    name: string;
    description: string;
    icon: string;
    color: string;
    points: number;
  }
> = {
  FIRST_SALE: {
    name: "First Sale",
    description: "Received your first payment",
    icon: "🎉",
    color: "emerald",
    points: 100,
  },
  EARLY_ADOPTER: {
    name: "Early Adopter",
    description: "Joined Sera before public launch",
    icon: "🚀",
    color: "purple",
    points: 250,
  },
  RELIABLE_REVENUE: {
    name: "Reliable Revenue",
    description: "30 consecutive days with payments",
    icon: "📈",
    color: "cyan",
    points: 500,
  },
  SPEED_DEMON: {
    name: "Speed Demon",
    description: "Invoice paid within 1 hour of sending",
    icon: "⚡",
    color: "amber",
    points: 50,
  },
  TEAM_PLAYER: {
    name: "Team Player",
    description: "Invited 3+ team members",
    icon: "👥",
    color: "blue",
    points: 100,
  },
  GLOBAL_MERCHANT: {
    name: "Global Merchant",
    description: "Received payments from 5+ countries",
    icon: "🌍",
    color: "green",
    points: 200,
  },
  CRYPTO_NATIVE: {
    name: "Crypto Native",
    description: "Received 10+ different tokens",
    icon: "₿",
    color: "orange",
    points: 150,
  },
  CENTURY_CLUB: {
    name: "Century Club",
    description: "Reached 100 transactions",
    icon: "💯",
    color: "red",
    points: 300,
  },
  VOLUME_BRONZE: {
    name: "Bronze Volume",
    description: "Reached $5,000 total volume",
    icon: "🥉",
    color: "amber",
    points: 100,
  },
  VOLUME_SILVER: {
    name: "Silver Volume",
    description: "Reached $25,000 total volume",
    icon: "🥈",
    color: "zinc",
    points: 200,
  },
  VOLUME_GOLD: {
    name: "Gold Volume",
    description: "Reached $100,000 total volume",
    icon: "🥇",
    color: "amber",
    points: 500,
  },
  VOLUME_DIAMOND: {
    name: "Diamond Volume",
    description: "Reached $500,000 total volume",
    icon: "💎",
    color: "cyan",
    points: 1000,
  },
  STREAK_WEEKLY: {
    name: "Weekly Warrior",
    description: "7-day login streak",
    icon: "🔥",
    color: "orange",
    points: 50,
  },
  STREAK_MONTHLY: {
    name: "Monthly Master",
    description: "30-day login streak",
    icon: "🔥🔥",
    color: "red",
    points: 200,
  },
  REFERRAL_CHAMPION: {
    name: "Referral Champion",
    description: "10+ successful referrals",
    icon: "👑",
    color: "purple",
    points: 1000,
  },
};

/**
 * Award an achievement to a user
 * Returns the achievement if newly awarded, null if already had it
 */
export async function awardAchievement(
  userId: string,
  type: AchievementType,
  metadata?: Record<string, unknown>
) {
  try {
    // Check if already has this achievement
    const existing = await db.achievement.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });

    if (existing) return null;

    // Award the achievement
    const achievement = await db.achievement.create({
      data: {
        userId,
        type,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : Prisma.JsonNull,
      },
    });

    // Award points
    const points = ACHIEVEMENT_DEFINITIONS[type].points;
    await addPoints(userId, points, `achievement_${type.toLowerCase()}`, {
      achievementType: type,
    });

    return achievement;
  } catch (error) {
    console.error(`[ACHIEVEMENT] Failed to award ${type} to ${userId}:`, error);
    return null;
  }
}

/**
 * Add points to a user's balance
 */
export async function addPoints(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
) {
  await db.$transaction([
    db.pointTransaction.create({
      data: {
        userId,
        amount,
        reason,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : Prisma.JsonNull,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: {
        seraPoints: { increment: amount },
      },
    }),
  ]);
}

/**
 * Spend points from a user's balance
 * Returns true if successful, false if insufficient balance
 */
export async function spendPoints(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { seraPoints: true },
  });

  if (!user || user.seraPoints < amount) return false;

  await db.$transaction([
    db.pointTransaction.create({
      data: {
        userId,
        amount: -amount,
        reason,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : Prisma.JsonNull,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: {
        seraPoints: { decrement: amount },
      },
    }),
  ]);

  return true;
}

/**
 * Get user's achievements
 */
export async function getUserAchievements(userId: string) {
  const achievements = await db.achievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });

  return achievements.map((a) => ({
    ...a,
    definition: ACHIEVEMENT_DEFINITIONS[a.type],
  }));
}

/**
 * Get user's points balance and history
 */
export async function getUserPoints(userId: string, limit = 10) {
  const [user, history] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { seraPoints: true },
    }),
    db.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return {
    balance: user?.seraPoints || 0,
    history,
  };
}

/**
 * Update user's login streak
 * Call this when user logs in or visits the dashboard
 */
export async function updateStreak(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
    },
  });

  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.lastActiveDate
    ? new Date(user.lastActiveDate)
    : null;

  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
  }

  let newStreak = user.currentStreak;

  if (!lastActive) {
    // First activity ever
    newStreak = 1;
  } else {
    const diffDays = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Already logged in today, no change
      return { streak: newStreak, streakIncreased: false };
    } else if (diffDays === 1) {
      // Consecutive day
      newStreak += 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  }

  const newLongest = Math.max(newStreak, user.longestStreak);

  await db.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
    },
  });

  // Check for streak achievements
  if (newStreak === 7) {
    await awardAchievement(userId, "STREAK_WEEKLY", { streak: 7 });
  } else if (newStreak === 30) {
    await awardAchievement(userId, "STREAK_MONTHLY", { streak: 30 });
  }

  // Award streak points
  if (newStreak > 0 && newStreak % 7 === 0) {
    await addPoints(userId, 50, "streak_bonus", { streak: newStreak });
  }

  return {
    streak: newStreak,
    longestStreak: newLongest,
    streakIncreased: newStreak > user.currentStreak,
  };
}

/**
 * Check and award transaction-based achievements
 * Also updates goal progress and checks milestone rewards
 * Call this after a new payment is received
 */
export async function checkPaymentAchievements(
  userId: string,
  businessId: string,
  paymentAmount?: number
) {
  // Import goal and milestone services
  const { updateRevenueGoals } = await import("./goal-service");
  const { checkTransactionMilestones, checkVolumeMilestones } = await import("./milestone-service");
  
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      transactions: {
        where: {
          type: "inflow",
          status: { in: ["confirmed", "settled"] },
        },
      },
    },
  });

  if (!business) return [];

  const transactions = business.transactions;
  const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const txCount = transactions.length;

  const awarded: AchievementType[] = [];

  // First Sale
  if (txCount === 1) {
    const result = await awardAchievement(userId, "FIRST_SALE");
    if (result) awarded.push("FIRST_SALE");
  }

  // Century Club
  if (txCount >= 100) {
    const result = await awardAchievement(userId, "CENTURY_CLUB", { count: txCount });
    if (result) awarded.push("CENTURY_CLUB");
  }

  // Volume milestones
  if (totalVolume >= 500000) {
    const result = await awardAchievement(userId, "VOLUME_DIAMOND", { volume: totalVolume });
    if (result) awarded.push("VOLUME_DIAMOND");
  } else if (totalVolume >= 100000) {
    const result = await awardAchievement(userId, "VOLUME_GOLD", { volume: totalVolume });
    if (result) awarded.push("VOLUME_GOLD");
  } else if (totalVolume >= 25000) {
    const result = await awardAchievement(userId, "VOLUME_SILVER", { volume: totalVolume });
    if (result) awarded.push("VOLUME_SILVER");
  } else if (totalVolume >= 5000) {
    const result = await awardAchievement(userId, "VOLUME_BRONZE", { volume: totalVolume });
    if (result) awarded.push("VOLUME_BRONZE");
  }

  // === Phase 2: Update Goal Progress ===
  if (paymentAmount && paymentAmount > 0) {
    try {
      await updateRevenueGoals(userId, paymentAmount);
    } catch (error) {
      console.error("[ACHIEVEMENT-SERVICE] Failed to update revenue goals:", error);
    }
  }

  // === Phase 2: Check Milestone Rewards ===
  try {
    // Check transaction count milestones (100 tx → fee discount, etc.)
    await checkTransactionMilestones(userId, businessId);
    
    // Check monthly volume milestones ($10k → featured merchant, etc.)
    await checkVolumeMilestones(userId, businessId);
  } catch (error) {
    console.error("[ACHIEVEMENT-SERVICE] Failed to check milestones:", error);
  }

  return awarded;
}

// ============================================================================
// Phase 2: Points Awarding Functions
// ============================================================================

import { POINTS_CONFIG } from "@/lib/constants/points";

/**
 * Award points for completing onboarding
 */
export async function awardOnboardingPoints(userId: string): Promise<number> {
  const points = POINTS_CONFIG.COMPLETE_ONBOARDING;
  await addPoints(userId, points, "complete_onboarding", { action: "onboarding_completed" });
  return points;
}

/**
 * Award points for creating first invoice
 */
export async function awardFirstInvoicePoints(userId: string): Promise<number> {
  // Check if already awarded
  const existing = await db.pointTransaction.findFirst({
    where: { userId, reason: "first_invoice" },
  });
  if (existing) return 0;

  const points = POINTS_CONFIG.CREATE_FIRST_INVOICE;
  await addPoints(userId, points, "first_invoice", { action: "first_invoice_created" });
  return points;
}

/**
 * Award points for receiving first payment
 */
export async function awardFirstPaymentPoints(userId: string): Promise<number> {
  // Check if already awarded
  const existing = await db.pointTransaction.findFirst({
    where: { userId, reason: "first_payment" },
  });
  if (existing) return 0;

  const points = POINTS_CONFIG.FIRST_PAYMENT_RECEIVED;
  await addPoints(userId, points, "first_payment", { action: "first_payment_received" });
  return points;
}

/**
 * Award points for enabling passkey authentication
 */
export async function awardPasskeyPoints(userId: string): Promise<number> {
  // Check if already awarded
  const existing = await db.pointTransaction.findFirst({
    where: { userId, reason: "enable_passkey" },
  });
  if (existing) return 0;

  const points = POINTS_CONFIG.ENABLE_PASSKEY;
  await addPoints(userId, points, "enable_passkey", { action: "passkey_enabled" });
  return points;
}

/**
 * Award points for successful referral
 */
export async function awardReferralPoints(userId: string, refereeId: string): Promise<number> {
  const points = POINTS_CONFIG.SUCCESSFUL_REFERRAL;
  await addPoints(userId, points, "referral_signup", { refereeId });
  return points;
}

/**
 * Award points for completing profile
 */
export async function awardProfileCompletePoints(userId: string): Promise<number> {
  // Check if already awarded
  const existing = await db.pointTransaction.findFirst({
    where: { userId, reason: "complete_profile" },
  });
  if (existing) return 0;

  const points = POINTS_CONFIG.COMPLETE_PROFILE;
  await addPoints(userId, points, "complete_profile", { action: "profile_completed" });
  return points;
}

/**
 * Award points for connecting an integration
 */
export async function awardIntegrationPoints(userId: string, integrationName: string): Promise<number> {
  const points = POINTS_CONFIG.CONNECT_INTEGRATION;
  await addPoints(userId, points, "connect_integration", { integration: integrationName });
  return points;
}

/**
 * Award daily login bonus (small bonus for engagement)
 */
export async function awardDailyLoginPoints(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already awarded today
  const existing = await db.pointTransaction.findFirst({
    where: {
      userId,
      reason: "daily_login",
      createdAt: { gte: today },
    },
  });
  if (existing) return 0;

  const points = POINTS_CONFIG.STREAK_DAILY_BONUS;
  await addPoints(userId, points, "daily_login", { date: today.toISOString() });
  return points;
}

/**
 * Award volume-based bonus points
 * Called monthly to award points based on processing volume
 */
export async function awardVolumeBonus(userId: string, monthlyVolume: number): Promise<number> {
  // Calculate points: 1 point per $100 of volume
  const points = Math.floor(monthlyVolume / 100) * POINTS_CONFIG.VOLUME_BONUS_PER_100;
  if (points <= 0) return 0;

  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  await addPoints(userId, points, "volume_bonus", { monthlyVolume, month });
  return points;
}

/**
 * Award points for inviting a team member
 */
export async function awardTeamInvitePoints(userId: string): Promise<number> {
  const points = POINTS_CONFIG.INVITE_TEAM_MEMBER;
  await addPoints(userId, points, "team_invite", { action: "team_member_invited" });
  return points;
}

/**
 * Award points for sharing a receipt
 */
export async function awardShareReceiptPoints(userId: string): Promise<number> {
  const points = POINTS_CONFIG.SHARE_RECEIPT;
  await addPoints(userId, points, "share_receipt", { action: "receipt_shared" });
  return points;
}

