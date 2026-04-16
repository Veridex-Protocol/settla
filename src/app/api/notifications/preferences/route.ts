import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { z } from "zod";

const preferencesSchema = z.object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),

    // Payments
    paymentReceived: z.boolean().optional(),
    paymentFailed: z.boolean().optional(),
    largePaymentThreshold: z.number().optional().nullable(),

    // Invoices
    invoicePaid: z.boolean().optional(),
    invoiceOverdue: z.boolean().optional(),
    invoiceReminders: z.boolean().optional(),

    // Payment Links
    paymentLinkUsed: z.boolean().optional(),
    paymentLinkExpired: z.boolean().optional(),

    // Team
    teamMemberJoined: z.boolean().optional(),
    teamMemberLeft: z.boolean().optional(),

    // System
    securityAlerts: z.boolean().optional(),
    systemUpdates: z.boolean().optional(),

    // Marketing
    weeklyDigest: z.boolean().optional(),
    productUpdates: z.boolean().optional(),
    tips: z.boolean().optional(),

    // Digest
    digestFrequency: z.enum(["daily", "weekly", "monthly", "never"]).optional(),

    // Quiet hours
    quietHoursStart: z.string().optional().nullable(),
    quietHoursEnd: z.string().optional().nullable(),
    quietHoursTimezone: z.string().optional(),
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the authenticated user
 */
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        let preferences = await db.notificationPreferences.findUnique({
            where: { userId: authUser.id },
        });

        // If no preferences exist, create default preferences
        if (!preferences) {
            preferences = await db.notificationPreferences.create({
                data: {
                    userId: authUser.id,
                },
            });
        }

        return NextResponse.json(preferences);
    } catch (error) {
        console.error("[NOTIFICATION_PREFERENCES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences
 */
export async function PATCH(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const validatedData = preferencesSchema.parse(body);

        const preferences = await db.notificationPreferences.upsert({
            where: { userId: authUser.id },
            update: validatedData,
            create: {
                userId: authUser.id,
                ...validatedData,
            },
        });

        return NextResponse.json(preferences);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid preferences data", details: error.issues },
                { status: 400 }
            );
        }
        console.error("[NOTIFICATION_PREFERENCES_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
