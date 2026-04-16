"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    Medal,
    Crown,
    Gem,
    Star,
    TrendingUp,
    Gift,
    Check,
    Lock,
    ChevronRight,
} from "lucide-react";
import { AnimatedCurrency } from "@/components/ui/animated-counter";
import { Button } from "@/components/ui";

// Tier definitions
export const MERCHANT_TIERS = {
    bronze: {
        name: "Bronze",
        icon: Medal,
        color: "text-amber-600",
        bgColor: "bg-amber-600/10",
        borderColor: "border-amber-600/30",
        gradientFrom: "from-amber-700",
        gradientTo: "to-amber-500",
        minVolume: 0,
        feeRate: 0.01, // 1%
        benefits: [
            "Basic invoicing",
            "Payment links",
            "Email support",
            "Standard settlement",
        ],
    },
    silver: {
        name: "Silver",
        icon: Star,
        color: "text-zinc-400",
        bgColor: "bg-zinc-400/10",
        borderColor: "border-zinc-400/30",
        gradientFrom: "from-zinc-500",
        gradientTo: "to-zinc-300",
        minVolume: 5000,
        feeRate: 0.009, // 0.9%
        benefits: [
            "All Bronze benefits",
            "Custom invoice branding",
            "Priority email support",
            "Basic analytics",
            "API access",
        ],
    },
    gold: {
        name: "Gold",
        icon: Crown,
        color: "text-amber-400",
        bgColor: "bg-amber-400/10",
        borderColor: "border-amber-400/30",
        gradientFrom: "from-amber-500",
        gradientTo: "to-amber-300",
        minVolume: 25000,
        feeRate: 0.006, // 0.6%
        benefits: [
            "All Silver benefits",
            "Reduced fees (0.6%)",
            "Dedicated account manager",
            "Advanced analytics",
            "Early feature access",
            "Slack support channel",
        ],
    },
    diamond: {
        name: "Diamond",
        icon: Gem,
        color: "text-cyan-400",
        bgColor: "bg-cyan-400/10",
        borderColor: "border-cyan-400/30",
        gradientFrom: "from-cyan-500",
        gradientTo: "to-cyan-300",
        minVolume: 100000,
        feeRate: 0.004, // 0.4%
        benefits: [
            "All Gold benefits",
            "Lowest fees (0.4%)",
            "Custom API limits",
            "White-label options",
            "Revenue share on referrals",
            "24/7 priority support",
            "Custom integrations",
        ],
    },
};

type TierKey = keyof typeof MERCHANT_TIERS;

// Calculate current tier based on volume
export function calculateTier(totalVolume: number): TierKey {
    if (totalVolume >= MERCHANT_TIERS.diamond.minVolume) return "diamond";
    if (totalVolume >= MERCHANT_TIERS.gold.minVolume) return "gold";
    if (totalVolume >= MERCHANT_TIERS.silver.minVolume) return "silver";
    return "bronze";
}

// Get next tier
export function getNextTier(currentTier: TierKey): TierKey | null {
    const tiers: TierKey[] = ["bronze", "silver", "gold", "diamond"];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

// Tier badge component
interface TierBadgeProps {
    tier: TierKey;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function TierBadge({ tier, size = "md", className }: TierBadgeProps) {
    const tierData = MERCHANT_TIERS[tier];
    const Icon = tierData.icon;

    const sizes = {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
    };

    const iconSizes = {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-5 w-5",
    };

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full font-medium",
                tierData.bgColor,
                tierData.borderColor,
                tierData.color,
                "border",
                sizes[size],
                className
            )}
        >
            <Icon className={iconSizes[size]} />
            {tierData.name}
        </div>
    );
}

// Progress to next tier component
interface TierProgressProps {
    currentVolume: number;
    className?: string;
}

export function TierProgress({ currentVolume, className }: TierProgressProps) {
    const currentTier = calculateTier(currentVolume);
    const nextTier = getNextTier(currentTier);
    const tierData = MERCHANT_TIERS[currentTier];

    if (!nextTier) {
        // Already at Diamond
        return (
            <div
                className={cn(
                    "p-6 rounded-2xl border",
                    tierData.borderColor,
                    tierData.bgColor,
                    className
                )}
            >
                <div className="flex items-center gap-4">
                    <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center", tierData.bgColor)}>
                        <Gem className={cn("h-8 w-8", tierData.color)} />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-white flex items-center gap-2">
                            Diamond Merchant <Crown className="h-5 w-5 text-amber-400" />
                        </p>
                        <p className="text-sm text-zinc-400">
                            You've reached the highest tier. Enjoy all premium benefits!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const nextTierData = MERCHANT_TIERS[nextTier];
    const volumeToNextTier = nextTierData.minVolume - currentVolume;
    const progressPercent = Math.min(
        ((currentVolume - tierData.minVolume) / (nextTierData.minVolume - tierData.minVolume)) * 100,
        100
    );

    return (
        <div className={cn("p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <TierBadge tier={currentTier} />
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
                    <TierBadge tier={nextTier} />
                </div>
                <div className="text-right">
                    <p className="text-sm text-zinc-400">Volume to {nextTierData.name}</p>
                    <p className="text-lg font-semibold text-white">
                        <AnimatedCurrency value={volumeToNextTier} />
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-1000 bg-gradient-to-r",
                            nextTierData.gradientFrom,
                            nextTierData.gradientTo
                        )}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <span className="text-sm text-zinc-500">${tierData.minVolume.toLocaleString()}</span>
                    <span className="text-sm text-zinc-500">${nextTierData.minVolume.toLocaleString()}</span>
                </div>
            </div>

            {/* Benefits preview */}
            <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Unlock with {nextTierData.name}:
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {nextTierData.benefits.slice(0, 4).map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <Check className={cn("h-3 w-3", nextTierData.color)} />
                            <span className="text-zinc-300 truncate">{benefit}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Full tier comparison card
interface TierComparisonProps {
    currentTier: TierKey;
    className?: string;
}

export function TierComparison({ currentTier, className }: TierComparisonProps) {
    const tiers: TierKey[] = ["bronze", "silver", "gold", "diamond"];

    return (
        <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
            {tiers.map((tier) => {
                const tierData = MERCHANT_TIERS[tier];
                const Icon = tierData.icon;
                const isCurrent = tier === currentTier;
                const isLocked = tiers.indexOf(tier) > tiers.indexOf(currentTier);

                return (
                    <div
                        key={tier}
                        className={cn(
                            "relative p-5 rounded-2xl border transition-all",
                            isCurrent
                                ? cn(tierData.borderColor, tierData.bgColor, "ring-2", tierData.borderColor)
                                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                        )}
                    >
                        {isCurrent && (
                            <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400">
                                Current
                            </span>
                        )}

                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-4", tierData.bgColor)}>
                            <Icon className={cn("h-6 w-6", tierData.color)} />
                        </div>

                        <h3 className={cn("text-lg font-semibold mb-1", isCurrent ? "text-white" : "text-zinc-300")}>
                            {tierData.name}
                        </h3>
                        <p className="text-2xl font-bold text-white mb-1">
                            {(tierData.feeRate * 100).toFixed(1)}%
                            <span className="text-sm font-normal text-zinc-500 ml-1">fees</span>
                        </p>
                        <p className="text-sm text-zinc-500 mb-4">
                            Min ${tierData.minVolume.toLocaleString()} volume
                        </p>

                        <div className="space-y-2">
                            {tierData.benefits.slice(0, 3).map((benefit, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    {isLocked ? (
                                        <Lock className="h-3 w-3 text-zinc-600" />
                                    ) : (
                                        <Check className={cn("h-3 w-3", tierData.color)} />
                                    )}
                                    <span className={isLocked ? "text-zinc-600" : "text-zinc-400"}>
                                        {benefit}
                                    </span>
                                </div>
                            ))}
                            {tierData.benefits.length > 3 && (
                                <p className="text-xs text-zinc-600">
                                    +{tierData.benefits.length - 3} more benefits
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
