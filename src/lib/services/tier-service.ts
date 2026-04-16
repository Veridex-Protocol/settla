import { db } from "@/lib/db";
import { MerchantTier, Prisma } from "@prisma/client";

// Tier thresholds in USD
export const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 5000,
  GOLD: 25000,
  DIAMOND: 100000,
} as const;

// Tier benefits
export const TIER_BENEFITS = {
  BRONZE: {
    feeRate: 0.01, // 1%
    benefits: [
      "Basic invoicing",
      "Payment links",
      "Email support",
      "Standard settlement",
    ],
  },
  SILVER: {
    feeRate: 0.009, // 0.9%
    benefits: [
      "All Bronze benefits",
      "Custom invoice branding",
      "Priority email support",
      "Basic analytics",
      "API access",
    ],
  },
  GOLD: {
    feeRate: 0.006, // 0.6%
    benefits: [
      "All Silver benefits",
      "Reduced fees (0.6%)",
      "Dedicated account manager",
      "Advanced analytics",
      "Early feature access",
      "Slack support channel",
    ],
  },
  DIAMOND: {
    feeRate: 0.004, // 0.4%
    benefits: [
      "All Gold benefits",
      "Lowest fees (0.4%)",
      "Custom API limits",
      "White-label options",
      "Revenue share on referrals",
      "24/7 priority support",
      "Custom integrations",
    ],
  },
};

/**
 * Calculate the appropriate tier based on total volume
 */
export function calculateTierFromVolume(totalVolume: number): MerchantTier {
  if (totalVolume >= TIER_THRESHOLDS.DIAMOND) return "DIAMOND";
  if (totalVolume >= TIER_THRESHOLDS.GOLD) return "GOLD";
  if (totalVolume >= TIER_THRESHOLDS.SILVER) return "SILVER";
  return "BRONZE";
}

/**
 * Get the next tier after the current one
 */
export function getNextTier(currentTier: MerchantTier): MerchantTier | null {
  const tierOrder: MerchantTier[] = ["BRONZE", "SILVER", "GOLD", "DIAMOND"];
  const currentIndex = tierOrder.indexOf(currentTier);
  return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
}

/**
 * Get volume needed to reach the next tier
 */
export function getVolumeToNextTier(currentVolume: number, currentTier: MerchantTier): number | null {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return null;
  return TIER_THRESHOLDS[nextTier] - currentVolume;
}

/**
 * Get progress percentage towards next tier
 */
export function getTierProgress(currentVolume: number, currentTier: MerchantTier): number {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 100; // Already at max tier

  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const nextThreshold = TIER_THRESHOLDS[nextTier];
  const range = nextThreshold - currentThreshold;
  const progress = currentVolume - currentThreshold;

  return Math.min(Math.max((progress / range) * 100, 0), 100);
}

/**
 * Update user's tier based on their business volume
 * Returns the new tier if upgraded, null otherwise
 */
export async function updateUserTier(userId: string): Promise<MerchantTier | null> {
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
        },
      },
    },
  });

  if (!user || !user.business) return null;

  // Calculate total volume from transactions
  const totalVolume = user.business.transactions.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  );

  const newTier = calculateTierFromVolume(totalVolume);

  // Check if tier changed
  if (newTier !== user.merchantTier) {
    await db.user.update({
      where: { id: userId },
      data: {
        merchantTier: newTier,
        totalVolume: new Prisma.Decimal(totalVolume),
        tierUpdatedAt: new Date(),
      },
    });

    return newTier;
  }

  // Update volume even if tier didn't change
  await db.user.update({
    where: { id: userId },
    data: {
      totalVolume: new Prisma.Decimal(totalVolume),
    },
  });

  return null;
}

/**
 * Get user's current tier status
 */
export async function getUserTierStatus(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      merchantTier: true,
      totalVolume: true,
      tierUpdatedAt: true,
    },
  });

  if (!user) return null;

  const currentVolume = Number(user.totalVolume);
  const currentTier = user.merchantTier;
  const nextTier = getNextTier(currentTier);
  const volumeToNextTier = getVolumeToNextTier(currentVolume, currentTier);
  const progress = getTierProgress(currentVolume, currentTier);

  return {
    currentTier,
    currentVolume,
    nextTier,
    volumeToNextTier,
    progress,
    benefits: TIER_BENEFITS[currentTier],
    nextTierBenefits: nextTier ? TIER_BENEFITS[nextTier] : null,
    tierUpdatedAt: user.tierUpdatedAt,
  };
}

/**
 * Get fee rate for a tier
 */
export function getFeeRate(tier: MerchantTier): number {
  return TIER_BENEFITS[tier].feeRate;
}
