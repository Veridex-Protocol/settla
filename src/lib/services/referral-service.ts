import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { addPoints, awardAchievement } from "./achievement-service";

// Referral rewards in USD
const REFERRER_REWARD = 50; // $50 credit for referrer
const REFEREE_REWARD = 25; // $25 credit for new user

/**
 * Generate a unique referral code for a user
 */
export async function generateReferralCode(userId: string): Promise<string> {
  // Check if user already has a code
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) return user.referralCode;

  // Generate a new unique code
  let code = nanoid(8).toUpperCase();
  let attempts = 0;

  while (attempts < 5) {
    const existing = await db.user.findUnique({
      where: { referralCode: code },
    });

    if (!existing) break;
    code = nanoid(8).toUpperCase();
    attempts++;
  }

  // Save the code
  await db.user.update({
    where: { id: userId },
    data: { referralCode: code },
  });

  return code;
}

/**
 * Get referral code for a user (generates if doesn't exist)
 */
export async function getReferralCode(userId: string): Promise<string> {
  return generateReferralCode(userId);
}

/**
 * Apply a referral code during signup
 * Returns the referrer's userId if valid, null otherwise
 */
export async function applyReferralCode(
  newUserId: string,
  referralCode: string
): Promise<string | null> {
  if (!referralCode) {
    console.log('[Referral] No referral code provided');
    return null;
  }

  const normalizedCode = referralCode.toUpperCase();
  console.log('[Referral] Looking up referral code:', normalizedCode);

  // Find the referrer
  const referrer = await db.user.findUnique({
    where: { referralCode: normalizedCode },
    select: { id: true, referralCode: true },
  });

  console.log('[Referral] Referrer lookup result:', referrer);

  if (!referrer) {
    console.log('[Referral] No referrer found for code:', normalizedCode);
    return null;
  }

  // Don't allow self-referral
  if (referrer.id === newUserId) {
    console.log('[Referral] Self-referral blocked');
    return null;
  }

  // Update the new user with referrer info
  await db.user.update({
    where: { id: newUserId },
    data: { referredBy: normalizedCode },
  });

  console.log('[Referral] Updated user', newUserId, 'with referredBy:', normalizedCode);

  // Create the referral record
  await db.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: newUserId,
      status: "pending",
    },
  });

  console.log('[Referral] Created referral record: referrer=', referrer.id, 'referee=', newUserId);

  return referrer.id;
}

/**
 * Convert a referral when the new user makes their first payment
 * Awards credits to both referrer and referee
 */
export async function convertReferral(refereeId: string): Promise<boolean> {
  // Find pending referral for this user
  const referral = await db.referral.findUnique({
    where: { refereeId },
    include: { referrer: true },
  });

  if (!referral || referral.status !== "pending") return false;

  // Update referral status
  await db.referral.update({
    where: { id: referral.id },
    data: {
      status: "converted",
      convertedAt: new Date(),
      referrerReward: new Prisma.Decimal(REFERRER_REWARD),
      refereeReward: new Prisma.Decimal(REFEREE_REWARD),
      rewardedAt: new Date(),
    },
  });

  // Award points to referrer (500 points)
  await addPoints(referral.referrerId, 500, "referral_conversion", {
    refereeId,
    reward: REFERRER_REWARD,
  });

  // Award points to referee (250 points)
  await addPoints(refereeId, 250, "referral_welcome", {
    referrerId: referral.referrerId,
    reward: REFEREE_REWARD,
  });

  // Check if referrer should get Referral Champion achievement
  const totalReferrals = await db.referral.count({
    where: {
      referrerId: referral.referrerId,
      status: { in: ["converted", "rewarded"] },
    },
  });

  if (totalReferrals >= 10) {
    await awardAchievement(referral.referrerId, "REFERRAL_CHAMPION", {
      referralCount: totalReferrals,
    });
  }

  return true;
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string) {
  const [code, referrals, totalEarned] = await Promise.all([
    getReferralCode(userId),
    db.referral.findMany({
      where: { referrerId: userId },
      include: {
        referee: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.referral.aggregate({
      where: {
        referrerId: userId,
        status: { in: ["converted", "rewarded"] },
      },
      _sum: {
        referrerReward: true,
      },
    }),
  ]);

  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const convertedCount = referrals.filter(
    (r) => r.status === "converted" || r.status === "rewarded"
  ).length;

  return {
    referralCode: code,
    referralLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://sera.pay"}/signup?ref=${code}`,
    totalReferrals: referrals.length,
    pendingReferrals: pendingCount,
    convertedReferrals: convertedCount,
    totalEarned: Number(totalEarned._sum.referrerReward || 0),
    referrals: referrals.map((r) => ({
      id: r.id,
      status: r.status,
      userName: r.referee.name,
      userEmail: r.referee.email,
      signupDate: r.createdAt,
      convertedAt: r.convertedAt,
      reward: r.referrerReward ? Number(r.referrerReward) : null,
    })),
  };
}

/**
 * Get share content for referral
 */
export function getReferralShareContent(referralCode: string, referralLink: string) {
  return {
    twitter: {
      text: `I've been using @SeraPayHQ for accepting crypto payments - it's seamless! Use my referral link to get $25 credit: ${referralLink}`,
      url: referralLink,
    },
    whatsapp: {
      text: `Hey! Check out Settla for crypto payments. Use my link to get $25 credit: ${referralLink}`,
    },
    email: {
      subject: "Try Settla - Get $25 credit!",
      body: `Hi,\n\nI've been using Settla for accepting crypto payments and it's been great. They have passkey authentication (just use FaceID!), instant settlements, and super low fees.\n\nUse my referral link to sign up and get $25 credit:\n${referralLink}\n\nLet me know if you have any questions!`,
    },
    linkedin: {
      text: `Excited to share Settla - the best way to accept crypto payments for your business. Passkey auth, instant settlements, and amazing UX. Get $25 credit: ${referralLink}`,
      url: referralLink,
    },
  };
}
