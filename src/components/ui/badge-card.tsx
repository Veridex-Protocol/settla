"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Share2,
  Twitter,
  Linkedin,
  Copy,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

// Badge definitions matching the service
const BADGE_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  icon: string;
  gradientColors: [string, string];
  accentColor: string;
}> = {
  FIRST_SALE: {
    name: "First Sale",
    description: "Received your first payment",
    tier: "bronze",
    icon: "⭐",
    gradientColors: ["#f59e0b", "#d97706"],
    accentColor: "#fbbf24",
  },
  EARLY_ADOPTER: {
    name: "Early Adopter",
    description: "Pioneer of Settla",
    tier: "gold",
    icon: "🚀",
    gradientColors: ["#8b5cf6", "#7c3aed"],
    accentColor: "#a78bfa",
  },
  RELIABLE_REVENUE: {
    name: "Reliable Revenue",
    description: "30 days of consistent payments",
    tier: "platinum",
    icon: "📈",
    gradientColors: ["#06b6d4", "#0891b2"],
    accentColor: "#22d3ee",
  },
  SPEED_DEMON: {
    name: "Speed Demon",
    description: "Invoice paid within 1 hour",
    tier: "silver",
    icon: "⚡",
    gradientColors: ["#eab308", "#ca8a04"],
    accentColor: "#facc15",
  },
  TEAM_PLAYER: {
    name: "Team Player",
    description: "Built a team of 3+ members",
    tier: "silver",
    icon: "👥",
    gradientColors: ["#3b82f6", "#2563eb"],
    accentColor: "#60a5fa",
  },
  GLOBAL_MERCHANT: {
    name: "Global Merchant",
    description: "Payments from 5+ countries",
    tier: "gold",
    icon: "🌍",
    gradientColors: ["#6366f1", "#4f46e5"],
    accentColor: "#818cf8",
  },
  CRYPTO_NATIVE: {
    name: "Crypto Native",
    description: "Received 10+ different tokens",
    tier: "gold",
    icon: "💎",
    gradientColors: ["#f97316", "#ea580c"],
    accentColor: "#fb923c",
  },
  HUNDRED_CLUB: {
    name: "100 Club",
    description: "100 successful transactions",
    tier: "platinum",
    icon: "💯",
    gradientColors: ["#ec4899", "#db2777"],
    accentColor: "#f472b6",
  },
  THOUSAND_CLUB: {
    name: "1000 Club",
    description: "1,000 successful transactions",
    tier: "diamond",
    icon: "🏆",
    gradientColors: ["#06b6d4", "#0284c7"],
    accentColor: "#38bdf8",
  },
  STREAK_MASTER: {
    name: "Streak Master",
    description: "30-day login streak",
    tier: "gold",
    icon: "🔥",
    gradientColors: ["#ef4444", "#dc2626"],
    accentColor: "#f87171",
  },
  SECURITY_FIRST: {
    name: "Security First",
    description: "Enabled Passkey authentication",
    tier: "bronze",
    icon: "🛡️",
    gradientColors: ["#22c55e", "#16a34a"],
    accentColor: "#4ade80",
  },
  REFERRAL_CHAMPION: {
    name: "Referral Champion",
    description: "Referred 10+ merchants",
    tier: "diamond",
    icon: "🎁",
    gradientColors: ["#ec4899", "#be185d"],
    accentColor: "#f472b6",
  },
  ONBOARDING_COMPLETE: {
    name: "Onboarding Complete",
    description: "Completed all setup steps",
    tier: "bronze",
    icon: "✅",
    gradientColors: ["#10b981", "#059669"],
    accentColor: "#34d399",
  },
  VOLUME_ROOKIE: {
    name: "Volume Rookie",
    description: "Processed $1,000 in payments",
    tier: "bronze",
    icon: "💰",
    gradientColors: ["#64748b", "#475569"],
    accentColor: "#94a3b8",
  },
  VOLUME_PRO: {
    name: "Volume Pro",
    description: "Processed $100,000 in payments",
    tier: "platinum",
    icon: "💎",
    gradientColors: ["#7c3aed", "#6d28d9"],
    accentColor: "#a78bfa",
  },
  // Tier Badges - for sharing merchant tier status
  TIER_BRONZE: {
    name: "Bronze Merchant",
    description: "Verified Settla Merchant",
    tier: "bronze",
    icon: "🥉",
    gradientColors: ["#cd7f32", "#8b4513"],
    accentColor: "#d97706",
  },
  TIER_SILVER: {
    name: "Silver Merchant",
    description: "$10K+ processed on Settla",
    tier: "silver",
    icon: "🥈",
    gradientColors: ["#c0c0c0", "#808080"],
    accentColor: "#a1a1aa",
  },
  TIER_GOLD: {
    name: "Gold Merchant",
    description: "$50K+ processed on Settla",
    tier: "gold",
    icon: "🥇",
    gradientColors: ["#ffd700", "#daa520"],
    accentColor: "#fbbf24",
  },
  TIER_DIAMOND: {
    name: "Diamond Merchant",
    description: "$250K+ processed on Settla",
    tier: "diamond",
    icon: "💎",
    gradientColors: ["#00bfff", "#1e90ff"],
    accentColor: "#38bdf8",
  },
};

const TIER_CONFIGS = {
  bronze: {
    borderGradient: "from-orange-700 to-orange-900",
    badge: "🥉",
    label: "Bronze",
    labelColor: "text-orange-400",
  },
  silver: {
    borderGradient: "from-zinc-300 to-zinc-500",
    badge: "🥈",
    label: "Silver",
    labelColor: "text-zinc-300",
  },
  gold: {
    borderGradient: "from-amber-400 to-amber-600",
    badge: "🥇",
    label: "Gold",
    labelColor: "text-amber-400",
  },
  platinum: {
    borderGradient: "from-slate-200 to-slate-400",
    badge: "💠",
    label: "Platinum",
    labelColor: "text-slate-300",
  },
  diamond: {
    borderGradient: "from-cyan-300 to-blue-400",
    badge: "💎",
    label: "Diamond",
    labelColor: "text-cyan-300",
  },
};

interface BadgeCardProps {
  achievementType: string;
  merchantName: string;
  earnedAt: string;
  className?: string;
}

export function BadgeCard({
  achievementType,
  merchantName,
  earnedAt,
  className,
}: BadgeCardProps) {
  const badge = BADGE_DEFINITIONS[achievementType];
  const tierConfig = badge ? TIER_CONFIGS[badge.tier] : TIER_CONFIGS.bronze;

  if (!badge) return null;

  // Generate unique pattern based on achievementType
  let hash = 0;
  for (let i = 0; i < achievementType.length; i++) {
    hash = ((hash << 5) - hash) + achievementType.charCodeAt(i);
  }
  const patternRotation = Math.abs(hash) % 15;

  return (
    <div
      className={cn(
        "relative w-full max-w-[400px] aspect-[3/2] rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Outer gradient border */}
      <div className={cn(
        "absolute inset-0 p-[3px] rounded-2xl bg-gradient-to-br",
        tierConfig.borderGradient
      )}>
        {/* Inner card */}
        <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 relative overflow-hidden">
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, ${badge.accentColor} 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
              transform: `rotate(${patternRotation}deg)`,
            }}
          />

          {/* Content */}
          <div className="relative h-full p-5 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-xl">{tierConfig.badge}</span>
                <span className={cn("text-xs uppercase tracking-widest", tierConfig.labelColor)}>
                  {tierConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-[10px]">
                  ◈
                </div>
                <span className="text-white text-sm font-semibold">Settla</span>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center gap-4 my-4">
              {/* Badge icon */}
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${badge.gradientColors[0]}, ${badge.gradientColors[1]})`,
                  boxShadow: `0 8px 24px ${badge.accentColor}40`,
                }}
              >
                {badge.icon}
              </div>

              {/* Badge info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">
                  {badge.name}
                </h3>
                <p className="text-sm mt-1" style={{ color: badge.accentColor }}>
                  {badge.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end pt-3 border-t border-zinc-800">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Awarded to</p>
                <p className="text-sm font-semibold text-white mt-0.5 truncate max-w-[180px]">
                  {merchantName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Earned</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {new Date(earnedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Corner accents */}
          <div
            className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg opacity-40"
            style={{ borderColor: badge.accentColor }}
          />
          <div
            className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 rounded-br-lg opacity-40"
            style={{ borderColor: badge.accentColor }}
          />
        </div>
      </div>
    </div>
  );
}

interface BadgeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievementType: string;
  merchantName: string;
  earnedAt: string;
}

export function BadgeCardModal({
  isOpen,
  onClose,
  achievementType,
  merchantName,
  earnedAt,
}: BadgeCardModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const badge = BADGE_DEFINITIONS[achievementType];

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/badge-card?type=${achievementType}`);
      if (!response.ok) throw new Error("Failed to generate card");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sera-badge-${achievementType.toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = (platform: string) => {
    const shareUrl = `${window.location.origin}/verify/${achievementType}`;
    const isTierBadge = achievementType.startsWith("TIER_");
    const shareText = isTierBadge
      ? `I'm a verified ${badge?.name} on Settla! 🏆 Accept crypto payments with zero hassle. #SeraPay #CryptoPayments #Web3`
      : `I just earned the "${badge?.name}" badge on Settla! 🎉 #SeraPay #CryptoPayments`;
    
    let url = "";
    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
    }
    window.open(url, "_blank");
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/verify/${achievementType}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!badge) return null;

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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">Share Your Achievement</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Card Preview */}
              <div className="p-6 flex justify-center bg-zinc-950/50">
                <BadgeCard
                  achievementType={achievementType}
                  merchantName={merchantName}
                  earnedAt={earnedAt}
                />
              </div>

              {/* Actions */}
              <div className="p-4 space-y-4 border-t border-zinc-800">
                {/* Download button */}
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download Card
                </Button>

                {/* Share options */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleShare("twitter")}
                    className="flex-1 gap-2"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleShare("linkedin")}
                    className="flex-1 gap-2"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="flex-1 gap-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>

                <p className="text-center text-xs text-zinc-500">
                  Share your achievement and inspire others to join Settla!
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to use badge card modal
export function useBadgeCardModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<{
    type: string;
    merchantName: string;
    earnedAt: string;
  } | null>(null);

  const openBadgeCard = useCallback((type: string, merchantName: string, earnedAt: string) => {
    setSelectedBadge({ type, merchantName, earnedAt });
    setIsOpen(true);
  }, []);

  const closeBadgeCard = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    selectedBadge,
    openBadgeCard,
    closeBadgeCard,
  };
}
