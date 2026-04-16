import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
    getMilestonesWithProgress, 
    getActiveRewards,
    MILESTONES 
} from "@/lib/services/milestone-service";

/**
 * GET /api/milestones - Get user's milestone progress and active rewards
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { business: true },
        });

        if (!user?.businessId) {
            return NextResponse.json({ error: "No business found" }, { status: 404 });
        }

        // Get milestones with current progress
        const milestonesWithProgress = await getMilestonesWithProgress(
            session.user.id,
            user.businessId
        );

        // Get currently active rewards
        const activeRewards = await getActiveRewards(user.businessId);

        // Calculate summary stats
        const totalMilestones = MILESTONES.length;
        const achievedCount = milestonesWithProgress.filter(m => m.achieved).length;
        const inProgressCount = milestonesWithProgress.filter(
            m => !m.achieved && m.current > 0 && m.current < m.threshold
        ).length;

        return NextResponse.json({
            milestones: milestonesWithProgress,
            activeRewards,
            summary: {
                total: totalMilestones,
                achieved: achievedCount,
                inProgress: inProgressCount,
                completionRate: Math.round((achievedCount / totalMilestones) * 100),
            },
        });
    } catch (error) {
        console.error("[MILESTONES_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch milestones" },
            { status: 500 }
        );
    }
}
