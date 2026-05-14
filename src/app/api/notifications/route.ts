import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    NotificationType,
} from "@/lib/notifications";

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
 */
export async function GET(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");
        const unreadOnly = searchParams.get("unread") === "true";
        const type = searchParams.get("type") as NotificationType | undefined;

        const result = await getNotifications(authUser.id, {
            limit,
            offset,
            unreadOnly,
            type,
        });

        return NextResponse.json(result);
    } catch (error) {
        // Neon serverless pooler periodically drops idle connections / times
        // out during cold starts. Notifications are non-critical UI chrome —
        // degrade gracefully with an empty payload so the client doesn't
        // surface a 500 and stop polling. Real errors still log.
        const msg = error instanceof Error ? error.message : String(error);
        const isDbConnectivity =
            /timeout exceeded when trying to connect/i.test(msg) ||
            /Can't reach database server/i.test(msg) ||
            /Connection terminated/i.test(msg) ||
            // Prisma known-request P1001/P1002/P1008/P1017
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error as any)?.code === 'P1001' ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error as any)?.code === 'P1002' ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error as any)?.code === 'P1008' ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error as any)?.code === 'P1017';
        if (isDbConnectivity) {
            console.warn('[NOTIFICATIONS_GET] DB unavailable, serving empty payload:', msg);
            return NextResponse.json(
                { notifications: [], total: 0, unreadCount: 0, degraded: true },
                { status: 200, headers: { 'cache-control': 'no-store' } },
            );
        }
        console.error("[NOTIFICATIONS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: Request) {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { action, notificationId } = body;

        switch (action) {
            case "read":
                if (notificationId) {
                    await markNotificationRead(notificationId, authUser.id);
                } else {
                    await markAllNotificationsRead(authUser.id);
                }
                break;

            case "dismiss":
                if (!notificationId) {
                    return new NextResponse("Notification ID required", { status: 400 });
                }
                await dismissNotification(notificationId, authUser.id);
                break;

            case "dismiss_all":
                // Mark all as dismissed (don't delete from DB)
                await db.notification.updateMany({
                    where: {
                        userId: authUser.id,
                        dismissed: false,
                    },
                    data: {
                        dismissed: true,
                    },
                });
                break;

            default:
                return new NextResponse("Invalid action", { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NOTIFICATIONS_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

/**
 * DELETE /api/notifications
 * Clear all notifications (mark as dismissed)
 */
export async function DELETE() {
    try {
        const authUser = await getAuthenticatedUser();

        if (!authUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await db.notification.updateMany({
            where: {
                userId: authUser.id,
            },
            data: {
                dismissed: true,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NOTIFICATIONS_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
