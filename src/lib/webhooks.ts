/**
 * Webhook Service for Sera Dashboard
 * 
 * Handles sending webhooks to merchant endpoints with:
 * - HMAC-SHA256 signature verification
 * - Retry with exponential backoff
 * - Event logging
 */

import crypto from 'crypto';
import { prisma } from './db';

// Webhook event types
export type WebhookEventType =
    | 'payment.received'
    | 'payment.confirmed'
    | 'payment.failed'
    | 'invoice.created'
    | 'invoice.paid'
    | 'invoice.overdue'
    | 'settlement.completed'
    | 'settlement.failed';

export interface WebhookPayload {
    id: string;
    type: WebhookEventType;
    timestamp: string;
    data: Record<string, unknown>;
}

export interface WebhookConfig {
    id: string;
    url: string;
    secret: string;
    events: WebhookEventType[];
    active: boolean;
}

// Retry configuration
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 300000; // 5 minutes

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify webhook signature
 */
export function verifySignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = generateSignature(payload, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt: number): number {
    const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

/**
 * Send webhook with retry logic
 */
export async function sendWebhook(
    config: WebhookConfig,
    event: WebhookEventType,
    data: Record<string, unknown>
): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    const payload: WebhookPayload = {
        id: crypto.randomUUID(),
        type: event,
        timestamp: new Date().toISOString(),
        data,
    };

    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, config.secret);

    let lastError: string | undefined;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sera-Signature': signature,
                    'X-Sera-Event': event,
                    'X-Sera-Delivery': payload.id,
                    'X-Sera-Timestamp': payload.timestamp,
                    'User-Agent': 'Sera-Webhook/1.0',
                },
                body: payloadString,
                signal: AbortSignal.timeout(30000), // 30 second timeout
            });

            // Log the delivery attempt
            await logWebhookDelivery({
                webhookId: config.id,
                eventId: payload.id,
                eventType: event,
                url: config.url,
                statusCode: response.status,
                success: response.ok,
                attempt: attempt + 1,
                payload: payloadString,
            });

            if (response.ok) {
                return { success: true, attempts: attempt + 1 };
            }

            // Non-retryable status codes
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                lastError = `HTTP ${response.status}: ${response.statusText}`;
                return { success: false, attempts: attempt + 1, lastError };
            }

            lastError = `HTTP ${response.status}: ${response.statusText}`;
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';

            await logWebhookDelivery({
                webhookId: config.id,
                eventId: payload.id,
                eventType: event,
                url: config.url,
                statusCode: 0,
                success: false,
                attempt: attempt + 1,
                payload: payloadString,
                error: lastError,
            });
        }

        attempt++;

        if (attempt < MAX_RETRIES) {
            const delay = calculateRetryDelay(attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return { success: false, attempts: attempt, lastError };
}

/**
 * Log webhook delivery attempt
 */
async function logWebhookDelivery(log: {
    webhookId: string;
    eventId: string;
    eventType: string;
    url: string;
    statusCode: number;
    success: boolean;
    attempt: number;
    payload: string;
    error?: string;
}) {
    // In production, store this in a database table
    console.log('[Webhook Delivery]', {
        ...log,
        payload: log.payload.substring(0, 200) + '...', // Truncate for logging
    });
}

/**
 * Send webhook to all registered endpoints for a business
 */
export async function dispatchWebhook(
    businessId: string,
    event: WebhookEventType,
    data: Record<string, unknown>
): Promise<void> {
    // Get business webhooks from database (stored in branding JSON for now)
    const business = await prisma.business.findUnique({
        where: { id: businessId },
    });

    if (!business?.branding) return;

    const branding = business.branding as Record<string, unknown>;
    const webhooks = (branding.webhooks || []) as WebhookConfig[];

    const activeWebhooks = webhooks.filter(
        (w) => w.active && w.events.includes(event)
    );

    // Send to all matching webhooks in parallel
    await Promise.allSettled(
        activeWebhooks.map((webhook) => sendWebhook(webhook, event, data))
    );
}

/**
 * Generate a new webhook secret
 */
export function generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}
