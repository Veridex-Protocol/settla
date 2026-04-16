import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/auth/credentials - Get all credentials for the current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authenticators = await prisma.authenticator.findMany({
            where: { userId: session.user.id },
            select: {
                credentialID: true,
                credentialPublicKey: true,
                publicKeyX: true,
                publicKeyY: true,
                keyHash: true,
                name: true,
                createdAt: true,
                transports: true,
            },
        });

        return NextResponse.json({ authenticators });
    } catch (error) {
        console.error("Failed to fetch credentials:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/auth/credentials - Save extra metadata for a credential
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { credentialId, publicKeyX, publicKeyY, keyHash, name } = body;

        if (!credentialId) {
            return NextResponse.json({ error: "Missing credentialId" }, { status: 400 });
        }

        // VDX-API-007: Validate metadata fields — reject unexpected types and oversized payloads
        const HEX_PATTERN = /^(0x)?[0-9a-fA-F]+$/;
        if (publicKeyX !== undefined) {
            if (typeof publicKeyX !== "string" || publicKeyX.length > 130 || !HEX_PATTERN.test(publicKeyX)) {
                return NextResponse.json({ error: "Invalid publicKeyX" }, { status: 400 });
            }
        }
        if (publicKeyY !== undefined) {
            if (typeof publicKeyY !== "string" || publicKeyY.length > 130 || !HEX_PATTERN.test(publicKeyY)) {
                return NextResponse.json({ error: "Invalid publicKeyY" }, { status: 400 });
            }
        }
        if (keyHash !== undefined) {
            if (typeof keyHash !== "string" || keyHash.length > 66 || !HEX_PATTERN.test(keyHash)) {
                return NextResponse.json({ error: "Invalid keyHash" }, { status: 400 });
            }
        }
        if (name !== undefined) {
            if (typeof name !== "string" || name.length > 100) {
                return NextResponse.json({ error: "Invalid name" }, { status: 400 });
            }
        }

        // Check if authenticator exists first
        const existing = await prisma.authenticator.findUnique({
            where: { credentialID: credentialId },
        });

        if (!existing) {
            // Authenticator not found - this can happen if the passkey was created
            // but not yet saved to the database (race condition during registration)
            return NextResponse.json({ 
                error: "Authenticator not found. It may still be registering.", 
                code: "NOT_FOUND" 
            }, { status: 404 });
        }

        // Verify the authenticator belongs to this user
        if (existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Update the authenticator with the extra details
        const updated = await prisma.authenticator.update({
            where: { credentialID: credentialId },
            data: {
                publicKeyX,
                publicKeyY,
                keyHash,
                name: name || undefined,
            },
        });

        return NextResponse.json({ success: true, authenticator: updated });
    } catch (error) {
        console.error("Failed to update credential:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
