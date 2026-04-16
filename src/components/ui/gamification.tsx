"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    Circle,
    ChevronRight,
    Trophy,
    Sparkles,
    X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui";

interface ChecklistItem {
    id: string;
    label: string;
    description: string;
    href?: string;
    completed: boolean;
}

interface OnboardingChecklistProps {
    className?: string;
    onDismiss?: () => void;
}

export function OnboardingChecklist({ className, onDismiss }: OnboardingChecklistProps) {
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check localStorage for dismissed state
        const dismissed = localStorage.getItem("sera-onboarding-dismissed");
        if (dismissed === "true") {
            setIsDismissed(true);
            setIsLoading(false);
            return;
        }

        // Fetch checklist status
        const fetchChecklist = async () => {
            try {
                const res = await fetch("/api/onboarding/checklist");
                if (res.ok) {
                    const data = await res.json();
                    setItems(data.items);
                } else {
                    // Default checklist if API fails
                    setItems([
                        { id: "profile", label: "Set up business profile", description: "Add your business details", href: "/dashboard/settings", completed: false },
                        { id: "invoice", label: "Create first invoice", description: "Send an invoice to a customer", href: "/dashboard/invoices/new", completed: false },
                        { id: "payment-link", label: "Create payment link", description: "Generate a reusable payment link", href: "/dashboard/payments/new", completed: false },
                        { id: "first-payment", label: "Receive first payment", description: "Get paid by a customer", completed: false },
                        { id: "team", label: "Invite team member", description: "Collaborate with your team", href: "/dashboard/team", completed: false },
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch checklist:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChecklist();
    }, []);

    const handleDismiss = () => {
        localStorage.setItem("sera-onboarding-dismissed", "true");
        setIsDismissed(true);
        onDismiss?.();
    };

    const completedCount = items.filter((item) => item.completed).length;
    const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
    const allCompleted = completedCount === items.length && items.length > 0;

    if (isDismissed || isLoading) return null;

    // Don't show if all completed
    if (allCompleted) {
        return (
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 p-6",
                    className
                )}
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/20">
                        <Trophy className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            All Set! <Sparkles className="h-5 w-5 text-amber-400" />
                        </h3>
                        <p className="text-sm text-zinc-400">
                            You've completed your onboarding. Start growing your business!
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        🚀 Get Started
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        Complete these steps to set up your account
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-2 -mt-2 -mr-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-zinc-400">Progress</span>
                    <span className="text-emerald-400 font-medium">{completedCount} of {items.length}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                            item.completed
                                ? "bg-emerald-500/5"
                                : "bg-zinc-800/50 hover:bg-zinc-800"
                        )}
                        style={{
                            animationDelay: `${index * 50}ms`,
                        }}
                    >
                        {item.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        ) : (
                            <Circle className="h-5 w-5 text-zinc-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p
                                className={cn(
                                    "text-sm font-medium",
                                    item.completed ? "text-emerald-400 line-through" : "text-white"
                                )}
                            >
                                {item.label}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                        </div>
                        {!item.completed && item.href && (
                            <Link href={item.href}>
                                <Button variant="ghost" size="sm" className="flex-shrink-0">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Celebrate component for payment success
interface CelebrateProps {
    show: boolean;
    amount?: number;
    currency?: string;
    onComplete?: () => void;
}

export function Celebrate({ show, amount, currency = "USDC", onComplete }: CelebrateProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setVisible(true);
            // Play sound (optional)
            // const audio = new Audio('/sounds/success.mp3');
            // audio.volume = 0.3;
            // audio.play().catch(() => {});

            const timer = setTimeout(() => {
                setVisible(false);
                onComplete?.();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            {/* Confetti animation via CSS */}
            <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={i}
                        className="confetti-piece"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 0.5}s`,
                            backgroundColor: [
                                "#10b981",
                                "#06b6d4",
                                "#f59e0b",
                                "#8b5cf6",
                                "#ec4899",
                            ][Math.floor(Math.random() * 5)],
                        }}
                    />
                ))}
            </div>

            {/* Success message */}
            <div className="relative animate-bounce-once">
                <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-zinc-900/95 border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 animate-pulse">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white">Payment Received!</h2>
                        {amount && (
                            <p className="text-4xl font-bold text-emerald-400 mt-2">
                                +${amount.toLocaleString()} {currency}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <span className="text-sm">Ka-ching! 💰</span>
                    </div>
                </div>
            </div>

            {/* CSS for confetti */}
            <style jsx>{`
        .confetti-piece {
          position: absolute;
          top: -20px;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          animation: confetti-fall 3s ease-out forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }

        @keyframes bounce-once {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
}

// Fee savings calculator component
interface FeeSavingsProps {
    monthlyVolume: number;
    className?: string;
    referralLink?: string; // Optional prop
}

import { SmartShareCard } from "@/components/sharing/smart-share-card";

export function FeeSavingsCard({ monthlyVolume, className, referralLink: initialReferralLink }: FeeSavingsProps) {
    const [referralLink, setReferralLink] = useState(initialReferralLink || "");
    const [showShareCard, setShowShareCard] = useState(false);

    // Fetch referral link if not provided
    useEffect(() => {
        if (!monthlyVolume) return;
        if (!referralLink) {
            fetch("/api/referral")
                .then(res => res.json())
                .then(data => {
                    if (data?.referralLink) setReferralLink(data.referralLink);
                })
                .catch(err => console.error("Failed to fetch referral link:", err));
        }
    }, [referralLink, monthlyVolume]);

    const stripeRate = 0.035; // 3.5%
    const paypalRate = 0.04; // 4%
    const seraRate = 0.01; // 1%

    const stripeFees = monthlyVolume * stripeRate;
    const paypalFees = monthlyVolume * paypalRate;
    const seraFees = monthlyVolume * seraRate;

    const savings = Math.max(stripeFees, paypalFees) - seraFees;

    if (monthlyVolume < 100) return null;

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 p-6",
                className
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-lg font-semibold text-white">Your Savings This Month</h3>
                </div>
                {/* Close button for share card view */}
                {showShareCard && (
                    <button
                        onClick={() => setShowShareCard(false)}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {showShareCard ? (
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-700/50">
                    <p className="text-sm text-zinc-400 mb-4 text-center">
                        Share your savings and earn rewards!
                    </p>
                    <div className="flex justify-center">
                        <SmartShareCard
                            type="savings"
                            data={{
                                totalSaved: savings,
                                stripeCost: stripeFees,
                                paypalCost: paypalFees,
                                seraCost: seraFees,
                            }}
                            referralLink={referralLink || "https://sett.la"}
                        />
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-zinc-800/50">
                            <p className="text-xs text-zinc-500 mb-1">Stripe (3.5%)</p>
                            <p className="text-lg font-semibold text-red-400">${stripeFees.toFixed(2)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-800/50">
                            <p className="text-xs text-zinc-500 mb-1">PayPal (4%)</p>
                            <p className="text-lg font-semibold text-red-400">${paypalFees.toFixed(2)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <p className="text-xs text-emerald-400 mb-1">Sera (1%)</p>
                            <p className="text-lg font-semibold text-emerald-400">${seraFees.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div>
                            <p className="text-sm text-zinc-400">You saved</p>
                            <p className="text-2xl font-bold text-emerald-400">${savings.toFixed(2)}</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                            onClick={() => setShowShareCard(true)}
                        >
                            Share Savings
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
