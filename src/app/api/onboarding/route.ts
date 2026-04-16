import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const onboardingSchema = z.object({
    // Wallet
    walletAddress: z.string().min(1, "Wallet address is required"),
    hubAddress: z.string().optional(),
    keyHash: z.string().optional(),

    // Business Details
    name: z.string().min(1, "Business name is required"),
    email: z.string().email("Valid email is required"),
    industry: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),

    // Verification
    businessType: z.enum(["individual", "company"]),
    country: z.string().min(1, "Country is required"),
    taxId: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate input
        const validationResult = onboardingSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const data = validationResult.data;

        // Check if business with this email already exists
        const existingBusiness = await prisma.business.findUnique({
            where: { email: data.email },
        });

        if (existingBusiness) {
            return NextResponse.json(
                { error: "A business with this email already exists" },
                { status: 409 }
            );
        }

        // Create the business
        const business = await prisma.business.create({
            data: {
                name: data.name,
                email: data.email,
                walletAddress: data.walletAddress,
                branding: {
                    industry: data.industry,
                    website: data.website,
                    businessType: data.businessType,
                    country: data.country,
                    taxId: data.taxId,
                    hubAddress: data.hubAddress,
                    keyHash: data.keyHash,
                },
                kybStatus: "pending", // Will be verified later
            },
        });

        // Create a user record linked to this business
        const user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                businessId: business.id,
            },
        });

        return NextResponse.json({
            success: true,
            business: {
                id: business.id,
                name: business.name,
                email: business.email,
                walletAddress: business.walletAddress,
            },
            user: {
                id: user.id,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Onboarding error:", error);
        return NextResponse.json(
            { error: "Failed to complete onboarding" },
            { status: 500 }
        );
    }
}
