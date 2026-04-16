"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface SSENotification {
    type: "connected" | "heartbeat" | "notification";
    notification?: {
        id: string;
        type: string;
        title: string;
        message: string;
        actionUrl?: string;
        createdAt: string;
    };
    timestamp?: number;
    userId?: string;
}

interface UseNotificationStreamOptions {
    onNotification?: (notification: SSENotification["notification"]) => void;
    enabled?: boolean;
}

/**
 * Hook to subscribe to real-time notification stream via SSE
 */
export function useNotificationStream(options: UseNotificationStreamOptions = {}) {
    const { onNotification, enabled = true } = options;
    const [isConnected, setIsConnected] = useState(false);
    const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (!enabled || typeof window === "undefined") return;

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const eventSource = new EventSource("/api/notifications/stream");
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                setIsConnected(true);
                console.log("[NotificationStream] Connected");
            };

            eventSource.onmessage = (event) => {
                try {
                    const data: SSENotification = JSON.parse(event.data);

                    switch (data.type) {
                        case "connected":
                            console.log("[NotificationStream] Stream established");
                            break;
                        case "heartbeat":
                            setLastHeartbeat(data.timestamp || Date.now());
                            break;
                        case "notification":
                            if (data.notification && onNotification) {
                                onNotification(data.notification);
                            }
                            break;
                    }
                } catch (err) {
                    console.error("[NotificationStream] Failed to parse message:", err);
                }
            };

            eventSource.onerror = () => {
                console.log("[NotificationStream] Connection error, reconnecting...");
                setIsConnected(false);
                eventSource.close();
                eventSourceRef.current = null;

                // Reconnect after 5 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, 5000);
            };
        } catch (err) {
            console.error("[NotificationStream] Failed to connect:", err);
        }
    }, [enabled, onNotification]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setIsConnected(false);
    }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        isConnected,
        lastHeartbeat,
        reconnect: connect,
        disconnect,
    };
}
