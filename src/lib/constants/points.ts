/**
 * Sera Points Configuration
 * 
 * Defines point values for all actions in the gamification system.
 */

// ============================================================================
// Point Values
// ============================================================================

export const POINTS_CONFIG = {
    // Onboarding Actions
    COMPLETE_ONBOARDING: 100,
    COMPLETE_PROFILE: 50,
    ENABLE_PASSKEY: 25,

    // Invoice & Payment Actions
    CREATE_FIRST_INVOICE: 50,
    FIRST_PAYMENT_RECEIVED: 100,

    // Referrals
    SUCCESSFUL_REFERRAL: 500,

    // Volume-Based (per $100 monthly volume)
    VOLUME_BONUS_PER_100: 1,

    // Integrations
    CONNECT_INTEGRATION: 100,

    // Streaks
    STREAK_7_DAYS: 50,
    STREAK_30_DAYS: 200,
    STREAK_DAILY_BONUS: 5, // Small daily login bonus

    // Engagement
    SHARE_RECEIPT: 10,
    INVITE_TEAM_MEMBER: 25,

    // Milestones
    TRANSACTIONS_100: 200,
    TRANSACTIONS_500: 500,
    TRANSACTIONS_1000: 1000,
} as const;

// ============================================================================
// Reason Labels (for display in history)
// ============================================================================

export const POINTS_REASON_LABELS: Record<string, string> = {
    // Onboarding
    complete_onboarding: 'Completed onboarding',
    complete_profile: 'Completed business profile',
    enable_passkey: 'Enabled passkey authentication',

    // Invoice & Payment
    first_invoice: 'Created first invoice',
    first_payment: 'Received first payment',
    payment_received: 'Payment received',

    // Referrals
    referral_signup: 'Successful referral',
    referral_converted: 'Referral converted',

    // Volume
    volume_bonus: 'Monthly volume bonus',

    // Integrations
    connect_integration: 'Connected integration',

    // Streaks
    streak_bonus: 'Login streak bonus',
    streak_7_days: '7-day streak achieved',
    streak_30_days: '30-day streak achieved',
    daily_login: 'Daily login',

    // Engagement
    share_receipt: 'Shared payment receipt',
    team_invite: 'Invited team member',

    // Achievements (auto-generated from achievement service)
    achievement_first_sale: '🎉 First Sale achievement',
    achievement_early_adopter: '🚀 Early Adopter achievement',
    achievement_reliable_revenue: '📈 Reliable Revenue achievement',
    achievement_speed_demon: '⚡ Speed Demon achievement',
    achievement_team_player: '👥 Team Player achievement',
    achievement_global_merchant: '🌍 Global Merchant achievement',
    achievement_crypto_native: '₿ Crypto Native achievement',
    achievement_century_club: '💯 Century Club achievement',
    achievement_volume_bronze: '🥉 Bronze Volume achievement',
    achievement_volume_silver: '🥈 Silver Volume achievement',
    achievement_volume_gold: '🥇 Gold Volume achievement',
    achievement_volume_diamond: '💎 Diamond Volume achievement',
    achievement_streak_weekly: '🔥 Weekly Warrior achievement',
    achievement_streak_monthly: '🔥🔥 Monthly Master achievement',
    achievement_referral_champion: '👑 Referral Champion achievement',

    // Redemptions
    redeemed_fee_credit: 'Redeemed fee credit',
    redeemed_reward: 'Redeemed reward',

    // Fallback
    manual_adjustment: 'Manual adjustment',
    system_bonus: 'System bonus',
};

// ============================================================================
// Reward Store Items
// ============================================================================

export const REWARD_CATALOG = [
    {
        id: 'fee_credit_5',
        name: '$5 Fee Credit',
        description: 'Get $5 credit towards transaction fees',
        pointsCost: 500,
        category: 'fee_credits',
        icon: '💳',
        active: true,
    },
    {
        id: 'fee_credit_10',
        name: '$10 Fee Credit',
        description: 'Get $10 credit towards transaction fees',
        pointsCost: 900,
        category: 'fee_credits',
        icon: '💳',
        active: true,
    },
    {
        id: 'fee_credit_25',
        name: '$25 Fee Credit',
        description: 'Get $25 credit towards transaction fees',
        pointsCost: 2000,
        category: 'fee_credits',
        icon: '💳',
        active: true,
    },
    {
        id: 'priority_support',
        name: 'Priority Support Ticket',
        description: 'Skip the queue with priority support for 7 days',
        pointsCost: 300,
        category: 'support',
        icon: '🎫',
        active: true,
    },
    {
        id: 'beta_access',
        name: 'Early Beta Access',
        description: 'Get early access to upcoming features',
        pointsCost: 750,
        category: 'features',
        icon: '🧪',
        active: true,
    },
    {
        id: 'custom_branding',
        name: 'Custom Branding Unlock',
        description: 'Unlock custom branding options for invoices and payment links',
        pointsCost: 1500,
        category: 'features',
        icon: '🎨',
        active: true,
    },
    {
        id: 'analytics_pro',
        name: 'Pro Analytics (30 days)',
        description: 'Advanced analytics and insights for 30 days',
        pointsCost: 1000,
        category: 'features',
        icon: '📊',
        active: true,
    },
] as const;

export type RewardId = typeof REWARD_CATALOG[number]['id'];
export type RewardCategory = 'fee_credits' | 'support' | 'features' | 'merch';

/**
 * Get a human-readable label for a points reason
 */
export function getPointsReasonLabel(reason: string): string {
    return POINTS_REASON_LABELS[reason] || reason.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}
