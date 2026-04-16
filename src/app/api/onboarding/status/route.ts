import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET /api/onboarding/status - Check if user has completed onboarding
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                email: true,
                name: true,
                onboardingCompleted: true,
                business: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        walletAddress: true,
                        kybStatus: true,
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Determine if onboarding is complete
        const hasCompletedOnboarding = user.onboardingCompleted || (
            user.business?.name &&
            user.business?.email &&
            user.business?.walletAddress
        );

        return NextResponse.json({
            onboardingCompleted: hasCompletedOnboarding,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            business: user.business,
        });
    } catch (error) {
        console.error("[ONBOARDING_STATUS_GET]", error);
        return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
    }
}

// POST /api/onboarding/status - Mark onboarding as complete
export async function POST() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: authUser.id },
            data: { onboardingCompleted: true },
        });

        return NextResponse.json({ success: true, onboardingCompleted: true });
    } catch (error) {
        console.error("[ONBOARDING_STATUS_POST]", error);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }
}
