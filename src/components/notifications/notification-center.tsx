"use client";

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
    Bell,
    X,
    Check,
    CheckCheck,
    DollarSign,
    FileText,
    Users,
    Link2,
    Shield,
    Sparkles,
    TrendingUp,
    Loader2,
    ExternalLink,
    Settings,
    Trash2,
    Volume2,
    VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

// Types
interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, unknown>;
    read: boolean;
    readAt?: string;
    createdAt: string;
}

interface NotificationState {
    notifications: Notification[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
    isLoading: boolean;
    error: string | null;
    lastFetched: number;
    hasNewNotification: boolean;
}

// Context for global notification state
interface NotificationContextType extends NotificationState {
    refetch: () => Promise<void>;
    loadMore: () => Promise<void>;
    markAsRead: (notificationId?: string) => Promise<void>;
    dismiss: (notificationId: string) => Promise<void>;
    clearAll: () => Promise<void>;
    clearNewNotificationFlag: () => void;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotificationContext must be used within NotificationProvider");
    }
    return context;
}

// Notification icon mapping
const getNotificationIcon = (type: string) => {
    switch (type) {
        case "payment_received":
            return { Icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" };
        case "payment_failed":
            return { Icon: DollarSign, color: "text-red-400", bg: "bg-red-500/10" };
        case "invoice_paid":
            return { Icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10" };
        case "invoice_created":
        case "invoice_overdue":
        case "invoice_reminder":
            return { Icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10" };
        case "team_member_joined":
        case "team_member_left":
            return { Icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" };
        case "payment_link_used":
        case "payment_link_expired":
            return { Icon: Link2, color: "text-purple-400", bg: "bg-purple-500/10" };
        case "security_alert":
            return { Icon: Shield, color: "text-red-400", bg: "bg-red-500/10" };
        case "milestone_reached":
            return { Icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/10" };
        case "tip":
            return { Icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10" };
        default:
            return { Icon: Bell, color: "text-zinc-400", bg: "bg-zinc-500/10" };
    }
};

// Play notification sound using Web Audio API
const playNotificationSound = () => {
    try {
        // Try to use audio file first
        const audio = new Audio("/sounds/notification.mp3");
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Fallback to Web Audio API if file doesn't exist or can't play
            try {
                const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = "sine";
                gainNode.gain.value = 0.1;
                
                oscillator.start();
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.stop(audioContext.currentTime + 0.3);
            } catch {
                // Web Audio API not supported
            }
        });
    } catch {
        // Audio not supported
    }
};

// Custom hook for notifications
export function useNotifications() {
    const [state, setState] = useState<NotificationState>({
        notifications: [],
        total: 0,
        unreadCount: 0,
        hasMore: false,
        isLoading: true,
        error: null,
        lastFetched: 0,
        hasNewNotification: false,
    });
    const [soundEnabled, setSoundEnabled] = useState(true);
    const previousUnreadCount = useRef(0);

    const fetchNotifications = useCallback(async (offset = 0, append = false) => {
        try {
            setState((prev) => ({ ...prev, isLoading: !append, error: null }));

            const res = await fetch(`/api/notifications?limit=20&offset=${offset}`);
            if (!res.ok) throw new Error("Failed to fetch notifications");

            const data = await res.json();
            const newUnreadCount = data.unreadCount || 0;

            setState((prev) => {
                // Check if there are new notifications
                const hasNew = !append && newUnreadCount > previousUnreadCount.current && previousUnreadCount.current > 0;
                
                return {
                    notifications: append
                        ? [...prev.notifications, ...data.notifications]
                        : data.notifications,
                    total: data.total,
                    unreadCount: newUnreadCount,
                    hasMore: data.hasMore,
                    isLoading: false,
                    error: null,
                    lastFetched: Date.now(),
                    hasNewNotification: hasNew || prev.hasNewNotification,
                };
            });

            // Play sound for new notifications
            if (!append && newUnreadCount > previousUnreadCount.current && previousUnreadCount.current > 0) {
                if (soundEnabled) {
                    playNotificationSound();
                }
            }
            
            previousUnreadCount.current = newUnreadCount;
        } catch (error) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to load notifications",
            }));
        }
    }, [soundEnabled]);

    const clearNewNotificationFlag = useCallback(() => {
        setState((prev) => ({ ...prev, hasNewNotification: false }));
    }, []);

    const markAsRead = useCallback(async (notificationId?: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "read", notificationId }),
            });

            setState((prev) => {
                const newUnreadCount = notificationId
                    ? Math.max(0, prev.unreadCount - 1)
                    : 0;
                previousUnreadCount.current = newUnreadCount;
                
                return {
                    ...prev,
                    notifications: prev.notifications.map((n) =>
                        notificationId
                            ? n.id === notificationId
                                ? { ...n, read: true, readAt: new Date().toISOString() }
                                : n
                            : { ...n, read: true, readAt: new Date().toISOString() }
                    ),
                    unreadCount: newUnreadCount,
                };
            });
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    }, []);

    const dismiss = useCallback(async (notificationId: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "dismiss", notificationId }),
            });

            setState((prev) => {
                const wasUnread = prev.notifications.find((n) => n.id === notificationId && !n.read);
                const newUnreadCount = wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount;
                previousUnreadCount.current = newUnreadCount;
                
                return {
                    ...prev,
                    notifications: prev.notifications.filter((n) => n.id !== notificationId),
                    total: prev.total - 1,
                    unreadCount: newUnreadCount,
                };
            });
        } catch (error) {
            console.error("Failed to dismiss notification:", error);
        }
    }, []);

    const clearAll = useCallback(async () => {
        try {
            // Mark all as dismissed (don't delete from DB)
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "dismiss_all" }),
            });
            previousUnreadCount.current = 0;
            setState((prev) => ({
                ...prev,
                notifications: [],
                total: 0,
                unreadCount: 0,
                hasMore: false,
                hasNewNotification: false,
            }));
        } catch (error) {
            console.error("Failed to clear notifications:", error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Poll for new notifications every 10 seconds for better reactivity
        const interval = setInterval(() => fetchNotifications(), 10000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    return {
        ...state,
        refetch: () => fetchNotifications(),
        loadMore: () => fetchNotifications(state.notifications.length, true),
        markAsRead,
        dismiss,
        clearAll,
        clearNewNotificationFlag,
        soundEnabled,
        setSoundEnabled,
    };
}

// Notification Provider for app-wide state
interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const notifications = useNotifications();
    
    return (
        <NotificationContext.Provider value={notifications}>
            {children}
        </NotificationContext.Provider>
    );
}

// Notification Bell (for header)
interface NotificationBellProps {
    className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const { unreadCount, hasNewNotification, clearNewNotificationFlag } = useNotifications();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prevUnreadCount = useRef(unreadCount);

    // Shake animation when new notification arrives
    useEffect(() => {
        if (hasNewNotification || (unreadCount > prevUnreadCount.current && prevUnreadCount.current !== 0)) {
            setIsShaking(true);
            const timer = setTimeout(() => {
                setIsShaking(false);
                clearNewNotificationFlag();
            }, 1000);
            return () => clearTimeout(timer);
        }
        prevUnreadCount.current = unreadCount;
    }, [unreadCount, hasNewNotification, clearNewNotificationFlag]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "relative h-10 w-10 rounded-full transition-all duration-200",
                    unreadCount > 0 && "hover:bg-emerald-500/10",
                    isShaking && "animate-shake"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    unreadCount > 0 ? "text-emerald-400" : "text-zinc-400",
                    isShaking && "text-emerald-300"
                )} />
                
                {/* Notification badge */}
                {unreadCount > 0 && (
                    <span className={cn(
                        "absolute -top-1 -right-1 flex items-center justify-center rounded-full text-xs font-medium text-white transition-all duration-300",
                        unreadCount > 9 ? "h-5 w-auto px-1.5 min-w-[20px]" : "h-5 w-5",
                        isShaking 
                            ? "bg-emerald-400 scale-110" 
                            : "bg-emerald-500 animate-pulse"
                    )}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
                
                {/* Ripple effect for new notifications */}
                {isShaking && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-emerald-500/30" />
                )}
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-12 z-50 w-96 max-h-[32rem] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <NotificationCenter onClose={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
}

// Notification Center (dropdown/panel content)
interface NotificationCenterProps {
    onClose?: () => void;
    className?: string;
}

export function NotificationCenter({ onClose, className }: NotificationCenterProps) {
    const {
        notifications,
        unreadCount,
        hasMore,
        isLoading,
        error,
        loadMore,
        markAsRead,
        dismiss,
        clearAll,
    } = useNotifications();

    return (
        <div className={cn("flex flex-col", className)}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                <div>
                    <h3 className="font-semibold text-white">Notifications</h3>
                    <p className="text-xs text-zinc-500">
                        {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-zinc-400 hover:text-white"
                            onClick={() => markAsRead()}
                        >
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Mark all read
                        </Button>
                    )}
                    <Link href="/dashboard/settings#notifications">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                            onClick={onClose}
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </Link>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto max-h-[24rem]">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                            <Bell className="h-6 w-6 text-zinc-500" />
                        </div>
                        <p className="text-sm text-zinc-400">No notifications yet</p>
                        <p className="text-xs text-zinc-600 mt-1">
                            We'll notify you when something happens
                        </p>
                    </div>
                ) : (
                    <>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRead={() => !notification.read && markAsRead(notification.id)}
                                onDismiss={() => dismiss(notification.id)}
                                onClose={onClose}
                            />
                        ))}

                        {hasMore && (
                            <div className="p-3 text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-zinc-400"
                                    onClick={loadMore}
                                >
                                    Load more
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="border-t border-zinc-800 p-2 flex justify-between">
                    <Link href="/dashboard/notifications">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-zinc-400"
                            onClick={onClose}
                        >
                            View all notifications
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-zinc-500 hover:text-red-400"
                        onClick={clearAll}
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear all
                    </Button>
                </div>
            )}
        </div>
    );
}

// Individual notification item
interface NotificationItemProps {
    notification: Notification;
    onRead?: () => void;
    onDismiss?: () => void;
    onClose?: () => void;
}

function NotificationItem({
    notification,
    onRead,
    onDismiss,
    onClose,
}: NotificationItemProps) {
    const { Icon, color, bg } = getNotificationIcon(notification.type);
    const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
        addSuffix: true,
    });

    const handleClick = () => {
        onRead?.();
        onClose?.();
    };

    const content = (
        <div
            className={cn(
                "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/50 cursor-pointer",
                !notification.read && "bg-zinc-800/30"
            )}
            onClick={handleClick}
        >
            {/* Unread indicator */}
            {!notification.read && (
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-500" />
            )}

            {/* Icon */}
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", bg)}>
                <Icon className={cn("h-5 w-5", color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", notification.read ? "text-zinc-300" : "text-white")}>
                    {notification.title}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{notification.message}</p>
                <p className="text-xs text-zinc-600 mt-1">{timeAgo}</p>
            </div>

            {/* Actions */}
            <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.read && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRead?.();
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700/50"
                        title="Mark as read"
                    >
                        <Check className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss?.();
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700/50"
                    title="Dismiss"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );

    // If there's an action URL, wrap in Link
    if (notification.actionUrl) {
        return (
            <Link href={notification.actionUrl} className="block">
                {content}
            </Link>
        );
    }

    return content;
}

// Full-page notifications view
export function NotificationsPage() {
    const {
        notifications,
        unreadCount,
        total,
        hasMore,
        isLoading,
        loadMore,
        markAsRead,
        dismiss,
        clearAll,
    } = useNotifications();

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Notifications</h1>
                    <p className="text-zinc-400 mt-1">
                        {total} total, {unreadCount} unread
                    </p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700"
                            onClick={() => markAsRead()}
                        >
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Mark all read
                        </Button>
                    )}
                    {total > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-700 text-red-400 hover:text-red-300"
                            onClick={clearAll}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear all
                        </Button>
                    )}
                </div>
            </div>

            {/* Notification list */}
            <div className="space-y-2">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                            <div className="flex gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : notifications.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                            <Bell className="h-8 w-8 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No notifications</h3>
                        <p className="text-sm text-zinc-500">
                            When you receive payments, invoices, or other updates, they'll appear here.
                        </p>
                    </div>
                ) : (
                    <>
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden",
                                    !notification.read && "border-l-2 border-l-emerald-500"
                                )}
                            >
                                <NotificationItem
                                    notification={notification}
                                    onRead={() => !notification.read && markAsRead(notification.id)}
                                    onDismiss={() => dismiss(notification.id)}
                                />
                            </div>
                        ))}

                        {hasMore && (
                            <div className="text-center pt-4">
                                <Button variant="outline" onClick={loadMore} className="border-zinc-700">
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Load more
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
