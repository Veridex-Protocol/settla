/**
 * Notification Service for Sera Dashboard
 * 
 * Handles creating, sending, and managing notifications
 * Supports both in-app and email notifications
 */

import { db } from "@/lib/db";
import { sendEmail, EmailTemplate } from "@/lib/email";

// Notification types
export type NotificationType =
    | "payment_received"
    | "payment_failed"
    | "invoice_created"
    | "invoice_paid"
    | "invoice_overdue"
    | "invoice_reminder"
    | "payment_link_used"
    | "payment_link_expired"
    | "team_member_joined"
    | "team_member_left"
    | "security_alert"
    | "system_update"
    | "milestone_reached"
    | "goal_achieved"
    | "weekly_digest"
    | "tip";

// Notification metadata types
export interface PaymentNotificationMeta {
    amount: number;
    currency: string;
    transactionId?: string;
    txHash?: string;
    payerAddress?: string;
}

export interface InvoiceNotificationMeta {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    customerName?: string;
    dueDate?: string;
}

export interface TeamNotificationMeta {
    memberId: string;
    memberName?: string;
    memberEmail: string;
    role: string;
}

export interface MilestoneNotificationMeta {
    milestone: string;
    value?: number;
    previousValue?: number;
}

export type NotificationMeta =
    | PaymentNotificationMeta
    | InvoiceNotificationMeta
    | TeamNotificationMeta
    | MilestoneNotificationMeta
    | Record<string, unknown>;

// Create notification input
export interface CreateNotificationInput {
    userId: string;
    businessId?: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: NotificationMeta;
    expiresAt?: Date;
    sendEmail?: boolean;
    emailTemplate?: EmailTemplate;
    emailData?: Record<string, unknown>;
}

/**
 * Create a notification and optionally send email
 */
export async function createNotification(input: CreateNotificationInput) {
    const {
        userId,
        businessId,
        type,
        title,
        message,
        actionUrl,
        actionLabel,
        metadata,
        expiresAt,
        sendEmail: shouldSendEmail = true,
        emailTemplate,
        emailData,
    } = input;

    try {
        // Check user preferences
        const preferences = await getNotificationPreferences(userId);

        // Determine if we should create in-app notification
        const shouldCreateInApp = preferences?.inAppEnabled ?? true;

        // Determine if we should send email
        const shouldEmail = shouldSendEmail &&
            (preferences?.emailEnabled ?? true) &&
            shouldSendEmailForType(preferences, type);

        let notification = null;

        // Create in-app notification
        if (shouldCreateInApp) {
            notification = await db.notification.create({
                data: {
                    userId,
                    businessId,
                    type,
                    title,
                    message,
                    actionUrl,
                    actionLabel,
                    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
                    expiresAt,
                    emailSent: false,
                },
            });
        }

        // Send email notification
        if (shouldEmail && emailTemplate) {
            const user = await db.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true },
            });

            if (user?.email) {
                const business = businessId
                    ? await db.business.findUnique({
                        where: { id: businessId },
                        select: { name: true },
                    })
                    : null;

                const result = await sendEmail(
                    emailTemplate,
                    { email: user.email, name: user.name || undefined },
                    {
                        businessName: business?.name || "Settla",
                        ...emailData,
                    }
                );

                // Update notification with email status
                if (notification && result.success) {
                    await db.notification.update({
                        where: { id: notification.id },
                        data: {
                            emailSent: true,
                            emailSentAt: new Date(),
                        },
                    });
                }
            }
        }

        return notification;
    } catch (error) {
        console.error("[Notification Service] Failed to create notification:", error);
        throw error;
    }
}

/**
 * Get user's notification preferences (with defaults)
 */
export async function getNotificationPreferences(userId: string) {
    const preferences = await db.notificationPreferences.findUnique({
        where: { userId },
    });

    // Return preferences or default enabled state
    return preferences;
}

/**
 * Check if email should be sent for this notification type based on preferences
 */
function shouldSendEmailForType(
    preferences: Awaited<ReturnType<typeof getNotificationPreferences>>,
    type: NotificationType
): boolean {
    if (!preferences) return true; // Default: send emails

    switch (type) {
        case "payment_received":
        case "payment_failed":
            return preferences.paymentReceived;
        case "invoice_paid":
            return preferences.invoicePaid;
        case "invoice_overdue":
            return preferences.invoiceOverdue;
        case "invoice_reminder":
            return preferences.invoiceReminders;
        case "payment_link_used":
            return preferences.paymentLinkUsed;
        case "payment_link_expired":
            return preferences.paymentLinkExpired;
        case "team_member_joined":
            return preferences.teamMemberJoined;
        case "team_member_left":
            return preferences.teamMemberLeft;
        case "security_alert":
            return preferences.securityAlerts;
        case "system_update":
            return preferences.systemUpdates;
        case "weekly_digest":
            return preferences.weeklyDigest;
        case "tip":
            return preferences.tips;
        case "milestone_reached":
        case "invoice_created":
            return true; // Always send
        default:
            return true;
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string, userId: string) {
    return db.notification.updateMany({
        where: {
            id: notificationId,
            userId, // Ensure user owns this notification
        },
        data: {
            read: true,
            readAt: new Date(),
        },
    });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string) {
    return db.notification.updateMany({
        where: {
            userId,
            read: false,
        },
        data: {
            read: true,
            readAt: new Date(),
        },
    });
}

/**
 * Dismiss (hide) a notification
 */
export async function dismissNotification(notificationId: string, userId: string) {
    return db.notification.updateMany({
        where: {
            id: notificationId,
            userId,
        },
        data: {
            dismissed: true,
        },
    });
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
    userId: string,
    options: {
        limit?: number;
        offset?: number;
        unreadOnly?: boolean;
        type?: NotificationType;
    } = {}
) {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options;

    const where = {
        userId,
        dismissed: false,
        ...(unreadOnly && { read: false }),
        ...(type && { type }),
        OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
        ],
    };

    const [notifications, total, unreadCount] = await Promise.all([
        db.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        }),
        db.notification.count({ where }),
        db.notification.count({
            where: {
                userId,
                dismissed: false,
                read: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        }),
    ]);

    return {
        notifications,
        total,
        unreadCount,
        hasMore: offset + notifications.length < total,
    };
}

/**
 * Delete old notifications (for cleanup)
 */
export async function cleanupOldNotifications(daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return db.notification.deleteMany({
        where: {
            createdAt: { lt: cutoffDate },
            read: true,
        },
    });
}

// ============================================
// Pre-built notification creators for common events
// ============================================

/**
 * Notify merchant when payment is received
 */
export async function notifyPaymentReceived(
    userId: string,
    businessId: string,
    data: {
        amount: number;
        currency: string;
        transactionId: string;
        txHash?: string;
        payerAddress?: string;
    }
) {
    return createNotification({
        userId,
        businessId,
        type: "payment_received",
        title: "💰 Payment Received",
        message: `You received ${data.amount.toLocaleString()} ${data.currency}`,
        actionUrl: `/dashboard/transactions`,
        actionLabel: "View Transaction",
        metadata: data,
        sendEmail: true,
        emailTemplate: "payment_received",
        emailData: {
            amount: data.amount.toString(),
            currency: data.currency,
            transactionId: data.transactionId,
            txHash: data.txHash,
            explorerUrl: data.txHash
                ? `https://sepolia.etherscan.io/tx/${data.txHash}`
                : undefined,
        },
    });
}

/**
 * Notify merchant when invoice is paid
 */
export async function notifyInvoicePaid(
    userId: string,
    businessId: string,
    data: {
        invoiceId: string;
        invoiceNumber: string;
        amount: number;
        currency: string;
        customerName: string;
    }
) {
    return createNotification({
        userId,
        businessId,
        type: "invoice_paid",
        title: "✅ Invoice Paid",
        message: `Invoice #${data.invoiceNumber} has been paid by ${data.customerName}`,
        actionUrl: `/dashboard/invoices`,
        actionLabel: "View Invoice",
        metadata: data,
        sendEmail: true,
        emailTemplate: "invoice_paid",
        emailData: {
            invoiceNumber: data.invoiceNumber,
            amount: data.amount.toString(),
            currency: data.currency,
            customerName: data.customerName,
        },
    });
}

/**
 * Notify about overdue invoice
 */
export async function notifyInvoiceOverdue(
    userId: string,
    businessId: string,
    data: {
        invoiceId: string;
        invoiceNumber: string;
        amount: number;
        currency: string;
        customerName: string;
        daysOverdue: number;
    }
) {
    return createNotification({
        userId,
        businessId,
        type: "invoice_overdue",
        title: "⚠️ Invoice Overdue",
        message: `Invoice #${data.invoiceNumber} is ${data.daysOverdue} days overdue`,
        actionUrl: `/dashboard/invoices`,
        actionLabel: "Send Reminder",
        metadata: data,
        sendEmail: true,
        emailTemplate: "invoice_reminder",
        emailData: {
            invoiceNumber: data.invoiceNumber,
            amount: data.amount.toString(),
            currency: data.currency,
            customerName: data.customerName,
        },
    });
}

/**
 * Notify when team member joins
 */
export async function notifyTeamMemberJoined(
    userId: string,
    businessId: string,
    data: {
        memberId: string;
        memberName: string;
        memberEmail: string;
        role: string;
    }
) {
    return createNotification({
        userId,
        businessId,
        type: "team_member_joined",
        title: "👋 New Team Member",
        message: `${data.memberName || data.memberEmail} joined as ${data.role}`,
        actionUrl: `/dashboard/team`,
        actionLabel: "View Team",
        metadata: data,
        sendEmail: false, // Don't email for team changes
    });
}

/**
 * Notify about milestone achievement
 */
export async function notifyMilestoneReached(
    userId: string,
    businessId: string,
    data: {
        milestone: string;
        title: string;
        message: string;
    }
) {
    return createNotification({
        userId,
        businessId,
        type: "milestone_reached",
        title: `🎉 ${data.title}`,
        message: data.message,
        actionUrl: `/dashboard`,
        actionLabel: "View Dashboard",
        metadata: { milestone: data.milestone },
        sendEmail: true,
        emailTemplate: "welcome", // Reuse welcome template for now
        emailData: {},
    });
}

/**
 * Notify about security alert
 */
export async function notifySecurityAlert(
    userId: string,
    data: {
        alertType: string;
        message: string;
        actionRequired?: boolean;
    }
) {
    return createNotification({
        userId,
        type: "security_alert",
        title: "🔒 Security Alert",
        message: data.message,
        actionUrl: `/dashboard/settings`,
        actionLabel: data.actionRequired ? "Take Action" : "View Details",
        metadata: data,
        sendEmail: true,
        emailTemplate: "verification_required",
        emailData: {},
    });
}
