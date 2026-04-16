import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getReferralStats, getReferralShareContent } from "@/lib/services/referral-service";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const stats = await getReferralStats(authUser.id);
    const shareContent = getReferralShareContent(stats.referralCode, stats.referralLink);

    return NextResponse.json({
      ...stats,
      shareContent,
    });
  } catch (error) {
    console.error("[REFERRAL_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
