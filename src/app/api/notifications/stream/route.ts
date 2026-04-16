import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { addConnection, removeConnection } from "@/lib/notification-stream";

/**
 * SSE endpoint for real-time notifications
 * GET /api/notifications/stream
 * 
 * This endpoint creates a Server-Sent Events stream for real-time notifications
 * Clients can subscribe to receive instant updates when new notifications arrive
 */

export async function GET(request: NextRequest) {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = authUser.id;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            // Add this connection to the manager
            addConnection(userId, controller);

            // Send initial connection message
            const message = `data: ${JSON.stringify({ type: "connected", userId })}\n\n`;
            controller.enqueue(encoder.encode(message));

            // Send a heartbeat every 30 seconds to keep connection alive
            const heartbeatInterval = setInterval(() => {
                try {
                    const heartbeat = `data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`;
                    controller.enqueue(encoder.encode(heartbeat));
                } catch {
                    clearInterval(heartbeatInterval);
                }
            }, 30000);

            // Clean up on close
            request.signal.addEventListener("abort", () => {
                clearInterval(heartbeatInterval);
                removeConnection(userId, controller);
            });
        },
        cancel(controller) {
            // Connection was closed by client
            removeConnection(userId, controller as ReadableStreamDefaultController<Uint8Array>);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", // Disable buffering for nginx
        },
    });
}
