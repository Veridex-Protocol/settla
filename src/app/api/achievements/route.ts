import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getUserAchievements } from "@/lib/services/achievement-service";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const achievements = await getUserAchievements(authUser.id);

    return NextResponse.json({
      achievements,
      total: achievements.length,
    });
  } catch (error) {
    console.error("[ACHIEVEMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
