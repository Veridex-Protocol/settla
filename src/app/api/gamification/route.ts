import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getUserTierStatus, updateUserTier } from "@/lib/services/tier-service";
import {
    getUserAchievements,
    getUserPoints,
    updateStreak,
    evaluateAllAchievements,
} from "@/lib/services/achievement-service";
import { getReferralStats } from "@/lib/services/referral-service";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Update streak on dashboard visit
        const streakResult = await updateStreak(authUser.id);

        // Run retroactive achievement evaluation (idempotent). Best-effort —
        // never block the response.
        try {
            await evaluateAllAchievements(authUser.id);
        } catch (gamErr) {
            console.error("[GAMIFICATION_GET] evaluator failed:", gamErr);
        }

        const [tierStatus, achievements, points, referralStats, user] = await Promise.all([
      getUserTierStatus(authUser.id),
      getUserAchievements(authUser.id),
      getUserPoints(authUser.id, 5),
      getReferralStats(authUser.id),
      db.user.findUnique({
        where: { id: authUser.id },
        select: { name: true, business: { select: { name: true } } },
      }),
    ]);

    // Also update tier if needed
    await updateUserTier(authUser.id);

    return NextResponse.json({
      merchantName: user?.business?.name || user?.name || "Sera Merchant",
      tier: tierStatus,
      achievements: achievements.slice(0, 10), // Latest 10
      totalAchievements: achievements.length,
      points: {
        balance: points.balance,
        recentHistory: points.history,
      },
      streak: {
        current: streakResult?.streak || 0,
        longest: streakResult?.longestStreak || 0,
        increased: streakResult?.streakIncreased || false,
      },
      referral: {
        code: referralStats.referralCode,
        link: referralStats.referralLink,
        totalReferrals: referralStats.totalReferrals,
        convertedReferrals: referralStats.convertedReferrals,
        totalEarned: referralStats.totalEarned,
      },
    });
  } catch (error) {
    console.error("[GAMIFICATION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
