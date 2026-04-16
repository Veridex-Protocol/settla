import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { z } from "zod";
import { generateWebhookSecret } from "@/lib/webhooks";

const webhookSchema = z.object({
    url: z.string().url("Invalid webhook URL"),
    events: z.array(z.enum([
        'payment.received',
        'payment.confirmed',
        'payment.failed',
        'invoice.created',
        'invoice.paid',
        'invoice.overdue',
        'settlement.completed',
        'settlement.failed',
    ])).min(1, "At least one event is required"),
    active: z.boolean().default(true),
});

// GET /api/webhooks - List all webhooks for the business
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const business = await prisma.business.findUnique({
            where: { id: authUser.businessId },
        });

        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const branding = (business.branding as Record<string, unknown>) || {};
        const webhooks = (branding.webhooks || []) as Array<{
            id: string;
            url: string;
            events: string[];
            active: boolean;
            createdAt: string;
        }>;

        // Return webhooks without exposing secrets
        const safeWebhooks = webhooks.map((w: typeof webhooks[number]) => ({
            id: w.id,
            url: w.url,
            events: w.events,
            active: w.active,
            createdAt: w.createdAt,
        }));

        return NextResponse.json({ webhooks: safeWebhooks });
    } catch (error) {
        console.error("Failed to fetch webhooks:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const business = await prisma.business.findUnique({
            where: { id: authUser.businessId },
        });

        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const body = await request.json();
        const validation = webhookSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { url, events, active } = validation.data;

        // Generate new webhook with secret
        const newWebhook = {
            id: crypto.randomUUID(),
            url,
            secret: generateWebhookSecret(),
            events,
            active,
            createdAt: new Date().toISOString(),
        };

        // Update business branding with new webhook
        const branding = (business.branding as Record<string, unknown>) || {};
        const webhooks = (branding.webhooks || []) as unknown[];
        webhooks.push(newWebhook);

        const updatedBranding = { ...branding, webhooks };

        await prisma.business.update({
            where: { id: business.id },
            data: {
                branding: JSON.parse(JSON.stringify(updatedBranding)),
            },
        });

        return NextResponse.json({
            webhook: {
                id: newWebhook.id,
                url: newWebhook.url,
                secret: newWebhook.secret, // Only returned once on creation
                events: newWebhook.events,
                active: newWebhook.active,
                createdAt: newWebhook.createdAt,
            },
            message: "Webhook created. Save the secret - it won't be shown again.",
        });
    } catch (error) {
        console.error("Failed to create webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
