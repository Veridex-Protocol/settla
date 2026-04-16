"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Percent,
  Users,
  Headphones,
  Sparkles,
  Clock,
  Shield,
  Zap,
  X,
  CheckCircle,
  Lock,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";

type TierType = "bronze" | "silver" | "gold" | "diamond";

interface TierBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: TierType;
  upgradedFrom?: TierType;
}

const TIER_CONFIG = {
  bronze: {
    name: "Bronze",
    color: "from-orange-700 to-orange-900",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/50",
    bgColor: "bg-orange-500/10",
    icon: "🥉",
    volumeThreshold: "$0",
    feeRate: "0.5%",
  },
  silver: {
    name: "Silver",
    color: "from-zinc-400 to-zinc-600",
    textColor: "text-zinc-300",
    borderColor: "border-zinc-400/50",
    bgColor: "bg-zinc-400/10",
    icon: "🥈",
    volumeThreshold: "$10,000",
    feeRate: "0.4%",
  },
  gold: {
    name: "Gold",
    color: "from-amber-400 to-amber-600",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/50",
    bgColor: "bg-amber-500/10",
    icon: "🥇",
    volumeThreshold: "$50,000",
    feeRate: "0.3%",
  },
  diamond: {
    name: "Diamond",
    color: "from-cyan-400 to-blue-500",
    textColor: "text-cyan-400",
    borderColor: "border-cyan-500/50",
    bgColor: "bg-cyan-500/10",
    icon: "💎",
    volumeThreshold: "$250,000",
    feeRate: "0.2%",
  },
};

const TIER_BENEFITS: Record<TierType, {
  icon: React.ReactNode;
  title: string;
  description: string;
}[]> = {
  bronze: [
    {
      icon: <Percent className="h-5 w-5" />,
      title: "0.5% Transaction Fee",
      description: "Industry-leading low fees",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Non-Custodial Security",
      description: "Your keys, your funds",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Instant Settlement",
      description: "No waiting periods",
    },
  ],
  silver: [
    {
      icon: <Percent className="h-5 w-5" />,
      title: "0.4% Transaction Fee",
      description: "20% savings on fees",
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      title: "Priority Support",
      description: "Faster response times",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Early Access",
      description: "Beta features first",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "3 Team Members",
      description: "Invite your team",
    },
  ],
  gold: [
    {
      icon: <Percent className="h-5 w-5" />,
      title: "0.3% Transaction Fee",
      description: "40% savings on fees",
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      title: "Dedicated Support",
      description: "Direct support line",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "API Priority",
      description: "Higher rate limits",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "10 Team Members",
      description: "Scale your team",
    },
    {
      icon: <Crown className="h-5 w-5" />,
      title: "Custom Branding",
      description: "White-label invoices",
    },
  ],
  diamond: [
    {
      icon: <Percent className="h-5 w-5" />,
      title: "0.2% Transaction Fee",
      description: "60% savings on fees",
    },
    {
      icon: <Headphones className="h-5 w-5" />,
      title: "VIP Support",
      description: "24/7 priority line",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Unlimited API",
      description: "No rate limits",
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Unlimited Team",
      description: "No seat limits",
    },
    {
      icon: <Crown className="h-5 w-5" />,
      title: "Full White Label",
      description: "Custom domain support",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      title: "Account Manager",
      description: "Dedicated success manager",
    },
  ],
};

const TIER_ORDER: TierType[] = ["bronze", "silver", "gold", "diamond"];

export function TierBenefitsModal({
  isOpen,
  onClose,
  currentTier,
  upgradedFrom,
}: TierBenefitsModalProps) {
  const config = TIER_CONFIG[currentTier];
  const benefits = TIER_BENEFITS[currentTier];
  const isUpgrade = !!upgradedFrom;
  const currentIndex = TIER_ORDER.indexOf(currentTier);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={`relative w-full max-w-lg overflow-hidden rounded-2xl border ${config.borderColor} bg-zinc-900`}
            >
              {/* Gradient header */}
              <div className={`bg-gradient-to-r ${config.color} p-6 text-center`}>
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Tier icon with animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, damping: 10 }}
                  className="text-6xl mb-3"
                >
                  {config.icon}
                </motion.div>

                {isUpgrade ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Badge className="mb-2 bg-white/20 text-white border-white/30">
                        🎉 Tier Upgrade!
                      </Badge>
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white">
                      Welcome to {config.name}!
                    </h2>
                    <p className="text-white/80 mt-1">
                      You&apos;ve been upgraded from {TIER_CONFIG[upgradedFrom].name}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white">
                      {config.name} Tier Benefits
                    </h2>
                    <p className="text-white/80 mt-1">
                      Unlock at {config.volumeThreshold} monthly volume
                    </p>
                  </>
                )}
              </div>

              {/* Benefits list */}
              <div className="p-6 space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index + 0.4 }}
                    className={`flex items-center gap-4 p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}
                  >
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white`}>
                      {benefit.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{benefit.title}</h4>
                      <p className="text-sm text-zinc-400">{benefit.description}</p>
                    </div>
                    <CheckCircle className={`h-5 w-5 ${config.textColor}`} />
                  </motion.div>
                ))}
              </div>

              {/* Next tier preview */}
              {currentIndex < TIER_ORDER.length - 1 && (
                <div className="px-6 pb-6">
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-zinc-500" />
                        <div>
                          <p className="text-sm text-zinc-400">Next Tier</p>
                          <p className="font-medium text-white">
                            {TIER_CONFIG[TIER_ORDER[currentIndex + 1]].icon}{" "}
                            {TIER_CONFIG[TIER_ORDER[currentIndex + 1]].name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-500">Unlock at</p>
                        <p className={`font-medium ${TIER_CONFIG[TIER_ORDER[currentIndex + 1]].textColor}`}>
                          {TIER_CONFIG[TIER_ORDER[currentIndex + 1]].volumeThreshold}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="px-6 pb-6">
                <Button
                  onClick={onClose}
                  className={`w-full bg-gradient-to-r ${config.color} hover:opacity-90 text-white`}
                >
                  {isUpgrade ? "Start Using Benefits" : "Got It"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to show tier benefits
export function useTierBenefits() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTier, setCurrentTier] = useState<TierType>("bronze");
  const [upgradedFrom, setUpgradedFrom] = useState<TierType | undefined>();

  const showTierBenefits = (tier: TierType, previousTier?: TierType) => {
    setCurrentTier(tier);
    setUpgradedFrom(previousTier);
    setIsOpen(true);
  };

  const closeTierBenefits = () => {
    setIsOpen(false);
    setUpgradedFrom(undefined);
  };

  return {
    isOpen,
    currentTier,
    upgradedFrom,
    showTierBenefits,
    closeTierBenefits,
  };
}
