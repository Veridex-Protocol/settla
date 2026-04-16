/**
 * Real-time Notification Stream Manager
 * 
 * Manages SSE connections for real-time push notifications
 */

// Store active connections per user
const connections = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

/**
 * Add a connection for a user
 */
export function addConnection(userId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    if (!connections.has(userId)) {
        connections.set(userId, new Set());
    }
    connections.get(userId)!.add(controller);
}

/**
 * Remove a connection for a user
 */
export function removeConnection(userId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    connections.get(userId)?.delete(controller);
    if (connections.get(userId)?.size === 0) {
        connections.delete(userId);
    }
}

/**
 * Push a notification to all connected clients for a user
 * This is called internally when a new notification is created
 */
export function pushNotificationToUser(userId: string, notification: object) {
    const userConnections = connections.get(userId);
    if (!userConnections) return;

    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify({ type: "notification", notification })}\n\n`;
    const encodedMessage = encoder.encode(message);

    for (const controller of userConnections) {
        try {
            controller.enqueue(encodedMessage);
        } catch {
            // Connection may have been closed
            userConnections.delete(controller);
        }
    }
}

/**
 * Check if a user has active connections
 */
export function hasActiveConnection(userId: string): boolean {
    return (connections.get(userId)?.size ?? 0) > 0;
}

/**
 * Get count of active connections for a user
 */
export function getConnectionCount(userId: string): number {
    return connections.get(userId)?.size ?? 0;
}
