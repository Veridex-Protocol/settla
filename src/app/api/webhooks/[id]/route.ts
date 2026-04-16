import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { z } from "zod";
import { generateWebhookSecret } from "@/lib/webhooks";

const updateWebhookSchema = z.object({
    url: z.string().url("Invalid webhook URL").optional(),
    events: z.array(z.enum([
        'payment.received',
        'payment.confirmed',
        'payment.failed',
        'invoice.created',
        'invoice.paid',
        'invoice.overdue',
        'settlement.completed',
        'settlement.failed',
    ])).min(1).optional(),
    active: z.boolean().optional(),
    regenerateSecret: z.boolean().optional(),
});

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/webhooks/[id] - Get a specific webhook
export async function GET(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;

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

        const webhook = webhooks.find(w => w.id === id);
        if (!webhook) {
            return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
        }

        return NextResponse.json({
            webhook: {
                id: webhook.id,
                url: webhook.url,
                events: webhook.events,
                active: webhook.active,
                createdAt: webhook.createdAt,
            },
        });
    } catch (error) {
        console.error("Failed to fetch webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH /api/webhooks/[id] - Update a webhook
export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;

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
        const validation = updateWebhookSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const branding = (business.branding as Record<string, unknown>) || {};
        const webhooks = (branding.webhooks || []) as Array<{
            id: string;
            url: string;
            secret: string;
            events: string[];
            active: boolean;
            createdAt: string;
        }>;

        const webhookIndex = webhooks.findIndex(w => w.id === id);
        if (webhookIndex === -1) {
            return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
        }

        const updates = validation.data;
        let newSecret: string | undefined;

        // Update fields
        if (updates.url) webhooks[webhookIndex].url = updates.url;
        if (updates.events) webhooks[webhookIndex].events = updates.events;
        if (updates.active !== undefined) webhooks[webhookIndex].active = updates.active;
        if (updates.regenerateSecret) {
            newSecret = generateWebhookSecret();
            webhooks[webhookIndex].secret = newSecret;
        }

        await prisma.business.update({
            where: { id: business.id },
            data: {
                branding: {
                    ...branding,
                    webhooks,
                },
            },
        });

        const response: Record<string, unknown> = {
            webhook: {
                id: webhooks[webhookIndex].id,
                url: webhooks[webhookIndex].url,
                events: webhooks[webhookIndex].events,
                active: webhooks[webhookIndex].active,
                createdAt: webhooks[webhookIndex].createdAt,
            },
        };

        if (newSecret) {
            response.newSecret = newSecret;
            response.message = "Secret regenerated. Save it - it won't be shown again.";
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error("Failed to update webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/webhooks/[id] - Delete a webhook
export async function DELETE(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;

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
        const webhooks = (branding.webhooks || []) as Array<{ id: string }>;

        const filteredWebhooks = webhooks.filter(w => w.id !== id);

        if (filteredWebhooks.length === webhooks.length) {
            return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
        }

        await prisma.business.update({
            where: { id: business.id },
            data: {
                branding: {
                    ...branding,
                    webhooks: filteredWebhooks,
                },
            },
        });

        return NextResponse.json({ success: true, message: "Webhook deleted" });
    } catch (error) {
        console.error("Failed to delete webhook:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
