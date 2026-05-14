import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import { updateTeamGoals } from "@/lib/services/goal-service";
import {
    awardTeamPlayerBadgeIfEligible,
    awardTeamInvitePoints,
} from "@/lib/services/achievement-service";

const inviteSchema = z.object({
    email: z.string().email("Valid email is required"),
    name: z.string().optional(),
    role: z.enum(["admin", "finance", "developer", "member"]).default("member"),
});

// GET /api/team - List team members
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all team members for this business
        const teamMembers = await prisma.teamMember.findMany({
            where: { businessId: authUser.businessId },
            orderBy: { createdAt: 'desc' },
        });

        // Also get the business owner (users linked to this business)
        const businessOwner = await prisma.user.findFirst({
            where: { businessId: authUser.businessId },
            select: { id: true, name: true, email: true, createdAt: true },
        });

        // Format response
        const members = teamMembers.map((member: {
            id: string;
            email: string;
            name: string | null;
            role: string;
            status: string;
            lastActive: Date | null;
            createdAt: Date;
        }) => ({
            id: member.id,
            email: member.email,
            name: member.name || member.email.split('@')[0],
            role: member.role,
            status: member.status,
            lastActive: member.lastActive?.toISOString() || null,
            createdAt: member.createdAt.toISOString(),
        }));

        // Add owner as first member if exists
        const allMembers = businessOwner ? [{
            id: businessOwner.id,
            email: businessOwner.email,
            name: businessOwner.name || 'Owner',
            role: 'admin',
            status: 'active',
            lastActive: new Date().toISOString(),
            createdAt: businessOwner.createdAt.toISOString(),
            isOwner: true,
        }, ...members] : members;

        return NextResponse.json({
            members: allMembers,
            total: allMembers.length,
        });
    } catch (error) {
        console.error("[TEAM_GET]", error);
        return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
    }
}

// POST /api/team - Invite a new team member
export async function POST(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validation = inviteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { email, name, role } = validation.data;

        // Check if already a team member
        const existingMember = await prisma.teamMember.findUnique({
            where: {
                businessId_email: {
                    businessId: authUser.businessId,
                    email: email,
                },
            },
        });

        if (existingMember) {
            // Return generic success to prevent email enumeration (VDX-AUTH-011)
            return NextResponse.json({
                success: true,
                message: "Invitation processed",
                member: {
                    id: existingMember.id,
                    email: existingMember.email,
                    name: existingMember.name,
                    role: existingMember.role,
                    status: existingMember.status,
                },
            });
        }

        // Create the team member invite
        const teamMember = await prisma.teamMember.create({
            data: {
                businessId: authUser.businessId,
                email,
                name,
                role,
                status: 'invited',
                invitedBy: authUser.id,
            },
        });

        // Get business details for the email
        const business = await prisma.business.findUnique({
            where: { id: authUser.businessId },
            select: { name: true },
        });

        // Send invitation email
        const baseUrl = process.env.NEXTAUTH_URL || 'https://sera.veridex.io';
        const inviteLink = `${baseUrl}/invite/accept?token=${teamMember.id}`;
        
        const emailResult = await sendEmail(
            'team_invite',
            { email, name },
            {
                businessName: business?.name || 'Your Organization',
                inviteeName: name,
                inviterName: authUser.name || authUser.email || 'A team member',
                role,
                inviteLink,
            }
        );

        if (!emailResult.success) {
            console.error("[TEAM_INVITE_EMAIL]", emailResult.error);
            // Don't fail the request, just log the error
            // The invite was still created, they just won't get the email
        }

        // Update team goal progress (Phase 2 gamification)
        try {
            await updateTeamGoals(authUser.id);
        } catch (goalError) {
            console.error("[TEAM_POST] Failed to update team goals:", goalError);
        }

        // Gamification: invite points + TEAM_PLAYER badge (idempotent)
        try {
            await Promise.all([
                awardTeamInvitePoints(authUser.id),
                awardTeamPlayerBadgeIfEligible(authUser.id, authUser.businessId),
            ]);
        } catch (gamErr) {
            console.error("[TEAM_POST] gamification failed:", gamErr);
        }

        return NextResponse.json({
            success: true,
            emailSent: emailResult.success,
            member: {
                id: teamMember.id,
                email: teamMember.email,
                name: teamMember.name,
                role: teamMember.role,
                status: teamMember.status,
            },
        });
    } catch (error) {
        console.error("[TEAM_POST]", error);
        return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
    }
}
