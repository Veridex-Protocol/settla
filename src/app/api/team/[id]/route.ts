import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
    role: z.enum(["admin", "finance", "developer", "member"]).optional(),
    status: z.enum(["active", "inactive", "invited"]).optional(),
});

// PATCH /api/team/[id] - Update team member
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const validation = updateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        // Check member belongs to business
        const member = await prisma.teamMember.findFirst({
            where: { id, businessId: authUser.businessId },
        });

        if (!member) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Update member
        const updated = await prisma.teamMember.update({
            where: { id },
            data: {
                ...validation.data,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            member: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                role: updated.role,
                status: updated.status,
            },
        });
    } catch (error) {
        console.error("[TEAM_PATCH]", error);
        return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
    }
}

// DELETE /api/team/[id] - Remove team member
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Check member belongs to business
        const member = await prisma.teamMember.findFirst({
            where: { id, businessId: authUser.businessId },
        });

        if (!member) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        await prisma.teamMember.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[TEAM_DELETE]", error);
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }
}
