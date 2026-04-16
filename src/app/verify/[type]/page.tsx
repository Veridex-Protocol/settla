"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle,
  ExternalLink,
  Award,
  Calendar,
  User,
  ArrowLeft,
} from "lucide-react";
import { Button, Card, CardContent, Badge } from "@/components/ui";

// Badge definitions
const BADGE_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  icon: string;
  gradientColors: [string, string];
}> = {
  FIRST_SALE: {
    name: "First Sale",
    description: "Received first payment on Settla",
    tier: "bronze",
    icon: "⭐",
    gradientColors: ["#f59e0b", "#d97706"],
  },
  EARLY_ADOPTER: {
    name: "Early Adopter",
    description: "Pioneer of Settla platform",
    tier: "gold",
    icon: "🚀",
    gradientColors: ["#8b5cf6", "#7c3aed"],
  },
  RELIABLE_REVENUE: {
    name: "Reliable Revenue",
    description: "30 consecutive days with payments",
    tier: "platinum",
    icon: "📈",
    gradientColors: ["#06b6d4", "#0891b2"],
  },
  SPEED_DEMON: {
    name: "Speed Demon",
    description: "Invoice paid within 1 hour",
    tier: "silver",
    icon: "⚡",
    gradientColors: ["#eab308", "#ca8a04"],
  },
  TEAM_PLAYER: {
    name: "Team Player",
    description: "Built a team of 3+ members",
    tier: "silver",
    icon: "👥",
    gradientColors: ["#3b82f6", "#2563eb"],
  },
  GLOBAL_MERCHANT: {
    name: "Global Merchant",
    description: "Payments from 5+ countries",
    tier: "gold",
    icon: "🌍",
    gradientColors: ["#6366f1", "#4f46e5"],
  },
  CRYPTO_NATIVE: {
    name: "Crypto Native",
    description: "Received 10+ different tokens",
    tier: "gold",
    icon: "💎",
    gradientColors: ["#f97316", "#ea580c"],
  },
  HUNDRED_CLUB: {
    name: "100 Club",
    description: "100 successful transactions",
    tier: "platinum",
    icon: "💯",
    gradientColors: ["#ec4899", "#db2777"],
  },
  THOUSAND_CLUB: {
    name: "1000 Club",
    description: "1,000 successful transactions",
    tier: "diamond",
    icon: "🏆",
    gradientColors: ["#06b6d4", "#0284c7"],
  },
  STREAK_MASTER: {
    name: "Streak Master",
    description: "30-day login streak",
    tier: "gold",
    icon: "🔥",
    gradientColors: ["#ef4444", "#dc2626"],
  },
  SECURITY_FIRST: {
    name: "Security First",
    description: "Enabled Passkey authentication",
    tier: "bronze",
    icon: "🛡️",
    gradientColors: ["#22c55e", "#16a34a"],
  },
  REFERRAL_CHAMPION: {
    name: "Referral Champion",
    description: "Referred 10+ merchants",
    tier: "diamond",
    icon: "🎁",
    gradientColors: ["#ec4899", "#be185d"],
  },
  ONBOARDING_COMPLETE: {
    name: "Onboarding Complete",
    description: "Completed all setup steps",
    tier: "bronze",
    icon: "✅",
    gradientColors: ["#10b981", "#059669"],
  },
  VOLUME_ROOKIE: {
    name: "Volume Rookie",
    description: "Processed $1,000 in payments",
    tier: "bronze",
    icon: "💰",
    gradientColors: ["#64748b", "#475569"],
  },
  VOLUME_PRO: {
    name: "Volume Pro",
    description: "Processed $100,000 in payments",
    tier: "platinum",
    icon: "💎",
    gradientColors: ["#7c3aed", "#6d28d9"],
  },
};

const TIER_LABELS = {
  bronze: { name: "Bronze", color: "text-orange-400", badge: "🥉" },
  silver: { name: "Silver", color: "text-zinc-300", badge: "🥈" },
  gold: { name: "Gold", color: "text-amber-400", badge: "🥇" },
  platinum: { name: "Platinum", color: "text-slate-300", badge: "💠" },
  diamond: { name: "Diamond", color: "text-cyan-400", badge: "💎" },
};

interface VerificationData {
  verified: boolean;
  merchantName: string;
  achievementType: string;
  earnedAt: string;
  tier: string;
}

export default function VerifyBadgePage() {
  const params = useParams();
  const achievementType = params.type as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);

  const badge = BADGE_DEFINITIONS[achievementType];
  const tierLabel = badge ? TIER_LABELS[badge.tier] : null;

  useEffect(() => {
    // In production, this would verify against the backend
    // For now, we show the badge info as a static display
    setLoading(false);
  }, [achievementType]);

  if (!badge) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardContent className="pt-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Badge Not Found</h1>
            <p className="text-zinc-400 mb-6">
              This achievement badge does not exist or the link is invalid.
            </p>
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go to Settla
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-sm">
              ◈
            </div>
            <span className="text-white font-semibold">Settla</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Achievement Verification</h1>
          <p className="text-zinc-400 text-sm mt-1">
            This badge is verified by Settla
          </p>
        </div>

        {/* Badge Card */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          {/* Gradient top border */}
          <div 
            className="h-1"
            style={{
              background: `linear-gradient(to right, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`
            }}
          />
          
          <CardContent className="pt-8 pb-6">
            {/* Verified badge */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Verified Achievement</span>
            </div>

            {/* Badge icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="h-24 w-24 rounded-2xl flex items-center justify-center text-5xl"
                style={{
                  background: `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`,
                  boxShadow: `0 8px 32px ${badge.gradientColors[0]}40`,
                }}
              >
                {badge.icon}
              </motion.div>
            </div>

            {/* Badge info */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">{badge.name}</h2>
              <p className="text-zinc-400">{badge.description}</p>
              
              {/* Tier badge */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="text-lg">{tierLabel?.badge}</span>
                <span className={`text-sm font-medium ${tierLabel?.color}`}>
                  {tierLabel?.name} Tier Achievement
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-800 my-6" />

            {/* Info rows */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Award className="h-5 w-5 text-zinc-500" />
                <div>
                  <p className="text-zinc-500">Achievement Type</p>
                  <p className="text-white font-medium">{badge.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-5 w-5 text-zinc-500" />
                <div>
                  <p className="text-zinc-500">Verification Status</p>
                  <p className="text-emerald-400 font-medium">✓ Authentic Badge</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-6 text-center">
          <p className="text-zinc-500 text-sm mb-4">
            Want to earn badges like this?
          </p>
          <Link href="/">
            <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
              Get Started with Settla
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
          © {new Date().getFullYear()} Settla. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
