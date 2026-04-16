/**
 * Invoice & Receipt Branding API
 * 
 * Endpoints for managing custom branding for invoices and receipts
 * Based on merchant tier level
 */

import { getAuthenticatedUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
    getInvoiceBranding,
    getReceiptBranding,
    updateInvoiceBranding,
    updateReceiptBranding,
    generateAIReceiptBackground,
    getBrandingPermissions,
    getColorPresets,
    type InvoiceBrandingConfig,
    type ReceiptBrandingConfig,
} from "@/lib/services/branding-service";

/**
 * GET /api/branding
 * Get current branding configuration
 */
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: authUser.id },
            include: { business: true },
        });

        if (!user?.business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const [invoiceBranding, receiptBranding] = await Promise.all([
            getInvoiceBranding(user.business.id),
            getReceiptBranding(user.business.id),
        ]);

        const permissions = getBrandingPermissions(user.merchantTier);

        return NextResponse.json({
            tier: user.merchantTier,
            permissions,
            invoiceBranding,
            receiptBranding,
            colorPresets: getColorPresets(),
        });
    } catch (error) {
        console.error("Failed to get branding:", error);
        return NextResponse.json(
            { error: "Failed to get branding configuration" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/branding
 * Update branding configuration
 */
export async function PUT(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: authUser.id },
            include: { business: true },
        });

        if (!user?.business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const body = await request.json();
        const { type, branding } = body as {
            type: "invoice" | "receipt";
            branding: Partial<InvoiceBrandingConfig | ReceiptBrandingConfig>;
        };

        if (!type || !branding) {
            return NextResponse.json(
                { error: "Missing type or branding data" },
                { status: 400 }
            );
        }

        let result;
        if (type === "invoice") {
            result = await updateInvoiceBranding(
                user.business.id,
                user.id,
                branding as Partial<InvoiceBrandingConfig>
            );
        } else if (type === "receipt") {
            result = await updateReceiptBranding(
                user.business.id,
                user.id,
                branding as Partial<ReceiptBrandingConfig>
            );
        } else {
            return NextResponse.json(
                { error: "Invalid type. Must be 'invoice' or 'receipt'" },
                { status: 400 }
            );
        }

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            branding: result.branding,
        });
    } catch (error) {
        console.error("Failed to update branding:", error);
        return NextResponse.json(
            { error: "Failed to update branding configuration" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/branding/ai-background
 * Generate AI background for receipts (Diamond tier only)
 */
export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: authUser.id },
            include: { business: true },
        });

        if (!user?.business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const body = await request.json();
        const { theme, customPrompt } = body as {
            theme?: "professional" | "creative" | "minimal" | "luxury";
            customPrompt?: string;
        };

        const result = await generateAIReceiptBackground(
            user.business.id,
            user.id,
            { theme, customPrompt }
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            backgroundUrl: result.backgroundUrl,
        });
    } catch (error) {
        console.error("Failed to generate AI background:", error);
        return NextResponse.json(
            { error: "Failed to generate AI background" },
            { status: 500 }
        );
    }
}
