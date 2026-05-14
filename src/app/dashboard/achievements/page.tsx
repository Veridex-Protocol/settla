"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  Button,
} from "@/components/ui";
import { TierBadge, TierProgress } from "@/components/ui/merchant-tiers";
import { BadgeCardModal, useBadgeCardModal } from "@/components/ui/badge-card";
import {
  Award,
  Trophy,
  Star,
  Zap,
  Users,
  Globe,
  Coins,
  Target,
  Clock,
  Shield,
  Gift,
  TrendingUp,
  Sparkles,
  Lock,
  CheckCircle,
  Share2,
} from "lucide-react";

// Achievement icons mapping
const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  FIRST_SALE: <Star className="h-6 w-6" />,
  EARLY_ADOPTER: <Award className="h-6 w-6" />,
  RELIABLE_REVENUE: <TrendingUp className="h-6 w-6" />,
  SPEED_DEMON: <Zap className="h-6 w-6" />,
  TEAM_PLAYER: <Users className="h-6 w-6" />,
  GLOBAL_MERCHANT: <Globe className="h-6 w-6" />,
  CRYPTO_NATIVE: <Coins className="h-6 w-6" />,
  HUNDRED_CLUB: <Target className="h-6 w-6" />,
  THOUSAND_CLUB: <Trophy className="h-6 w-6" />,
  STREAK_MASTER: <Clock className="h-6 w-6" />,
  SECURITY_FIRST: <Shield className="h-6 w-6" />,
  REFERRAL_CHAMPION: <Gift className="h-6 w-6" />,
  ONBOARDING_COMPLETE: <CheckCircle className="h-6 w-6" />,
  VOLUME_ROOKIE: <Sparkles className="h-6 w-6" />,
  VOLUME_PRO: <Award className="h-6 w-6" />,
};

// Achievement definitions with colors
const ACHIEVEMENT_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  color: string;
  points: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}> = {
  FIRST_SALE: {
    name: "First Sale",
    description: "Received your first payment",
    color: "emerald",
    points: 100,
    rarity: "common",
  },
  EARLY_ADOPTER: {
    name: "Early Adopter",
    description: "Joined before official launch",
    color: "purple",
    points: 250,
    rarity: "rare",
  },
  RELIABLE_REVENUE: {
    name: "Reliable Revenue",
    description: "30 consecutive days with payments",
    color: "cyan",
    points: 500,
    rarity: "epic",
  },
  SPEED_DEMON: {
    name: "Speed Demon",
    description: "Invoice paid within 1 hour of creation",
    color: "yellow",
    points: 150,
    rarity: "uncommon",
  },
  TEAM_PLAYER: {
    name: "Team Player",
    description: "Invited 3+ team members",
    color: "blue",
    points: 200,
    rarity: "uncommon",
  },
  GLOBAL_MERCHANT: {
    name: "Global Merchant",
    description: "Received payments from 5+ countries",
    color: "indigo",
    points: 300,
    rarity: "rare",
  },
  CRYPTO_NATIVE: {
    name: "Crypto Native",
    description: "Received 10+ different tokens",
    color: "orange",
    points: 350,
    rarity: "rare",
  },
  HUNDRED_CLUB: {
    name: "100 Club",
    description: "Completed 100 transactions",
    color: "amber",
    points: 400,
    rarity: "rare",
  },
  THOUSAND_CLUB: {
    name: "1000 Club",
    description: "Completed 1,000 transactions",
    color: "gold",
    points: 1000,
    rarity: "legendary",
  },
  STREAK_MASTER: {
    name: "Streak Master",
    description: "Maintained a 30-day login streak",
    color: "red",
    points: 300,
    rarity: "rare",
  },
  SECURITY_FIRST: {
    name: "Security First",
    description: "Enabled Passkey authentication",
    color: "green",
    points: 50,
    rarity: "common",
  },
  REFERRAL_CHAMPION: {
    name: "Referral Champion",
    description: "Referred 10+ successful merchants",
    color: "pink",
    points: 750,
    rarity: "epic",
  },
  ONBOARDING_COMPLETE: {
    name: "Onboarding Complete",
    description: "Completed all onboarding steps",
    color: "teal",
    points: 100,
    rarity: "common",
  },
  VOLUME_ROOKIE: {
    name: "Volume Rookie",
    description: "Processed $1,000 in payments",
    color: "slate",
    points: 100,
    rarity: "common",
  },
  VOLUME_PRO: {
    name: "Volume Pro",
    description: "Processed $100,000 in payments",
    color: "violet",
    points: 500,
    rarity: "epic",
  },
};

interface Achievement {
  id: string;
  type: string;
  earnedAt: string;
}

interface AchievementsData {
  achievements: Achievement[];
  totalPoints: number;
  merchantName: string;
  tier: {
    currentTier: string;
    currentVolume: number;
    nextTier: string | null;
    volumeToNext: number | null;
    progress: number;
  };
}

const RARITY_COLORS = {
  common: "border-zinc-600 bg-zinc-800/50",
  uncommon: "border-green-600 bg-green-900/20",
  rare: "border-blue-600 bg-blue-900/20",
  epic: "border-emerald-600 bg-emerald-900/20",
  legendary: "border-yellow-500 bg-yellow-900/20 animate-pulse",
};

const RARITY_LABELS = {
  common: { text: "Common", color: "text-zinc-400" },
  uncommon: { text: "Uncommon", color: "text-green-400" },
  rare: { text: "Rare", color: "text-blue-400" },
  epic: { text: "Epic", color: "text-emerald-400" },
  legendary: { text: "Legendary", color: "text-yellow-400" },
};

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isOpen, selectedBadge, openBadgeCard, closeBadgeCard } = useBadgeCardModal();

  useEffect(() => {
    async function fetchData() {
      try {
        const [achievementsRes, gamificationRes] = await Promise.all([
          fetch("/api/achievements"),
          fetch("/api/gamification"),
        ]);
        
        const achievementsData = await achievementsRes.json();
        const gamificationData = await gamificationRes.json();
        
        setData({
          achievements: achievementsData.achievements || [],
          totalPoints: gamificationData.points?.balance || 0,
          merchantName: gamificationData.merchantName || "Sera Merchant",
          tier: gamificationData.tier || {
            currentTier: "BRONZE",
            currentVolume: 0,
            nextTier: "SILVER",
            volumeToNext: 10000,
            progress: 0,
          },
        });
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const earnedTypes = new Set(data?.achievements.map((a) => a.type) || []);
  const earnedCount = earnedTypes.size;
  const totalCount = Object.keys(ACHIEVEMENT_DEFINITIONS).length;

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header
          title="Achievements"
          description="Your progress and milestones"
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title={
          <span className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-amber-400" />
            Achievements
          </span>
        }
        description="Collect badges and earn points as you grow your business"
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Progress */}
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-zinc-400">Achievements Earned</p>
                  <p className="text-3xl font-bold text-white">
                    {earnedCount}
                    <span className="text-lg text-zinc-500">/{totalCount}</span>
                  </p>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Award className="h-8 w-8 text-amber-400" />
                </div>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${(earnedCount / totalCount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {Math.round((earnedCount / totalCount) * 100)}% complete
              </p>
            </CardContent>
          </Card>

          {/* Points */}
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-zinc-400">Sera Points</p>
                  <p className="text-3xl font-bold text-white">
                    {data?.totalPoints.toLocaleString() || 0}
                  </p>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Star className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              <p className="text-sm text-zinc-400">
                Earn points by completing actions and achievements
              </p>
            </CardContent>
          </Card>

          {/* Tier */}
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-zinc-400">Current Tier</p>
                  <div className="mt-1">
                    <TierBadge
                      tier={(data?.tier.currentTier?.toLowerCase() || "bronze") as "bronze" | "silver" | "gold" | "diamond"}
                      size="lg"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => openBadgeCard(
                    `TIER_${(data?.tier.currentTier || "BRONZE").toUpperCase()}`,
                    data?.merchantName || "Sera Merchant",
                    new Date().toISOString()
                  )}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
              {data?.tier.nextTier && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Progress to {data.tier.nextTier}</span>
                    <span>{Math.round(data.tier.progress)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${data.tier.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Achievement Categories */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Achievement Gallery
            </CardTitle>
            <CardDescription>
              Click on earned badges to share them on social media
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Object.entries(ACHIEVEMENT_DEFINITIONS).map(([type, def]) => {
                const earned = earnedTypes.has(type);
                const earnedAchievement = data?.achievements.find((a) => a.type === type);
                
                return (
                  <div
                    key={type}
                    className={`relative group rounded-xl border-2 p-4 transition-all duration-300 ${
                      earned
                        ? RARITY_COLORS[def.rarity]
                        : "border-zinc-800 bg-zinc-900/30 opacity-50"
                    } ${earned ? "hover:scale-105 hover:shadow-lg cursor-pointer" : ""}`}
                    onClick={() => {
                      if (earned && earnedAchievement) {
                        openBadgeCard(
                          type,
                          data?.merchantName || "Sera Merchant",
                          earnedAchievement.earnedAt
                        );
                      }
                    }}
                  >
                    {/* Locked overlay */}
                    {!earned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 rounded-xl">
                        <Lock className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}

                    {/* Share indicator for earned badges */}
                    {earned && (
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Share2 className="h-3 w-3 text-emerald-400" />
                      </div>
                    )}

                    {/* Badge content */}
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${
                          earned
                            ? `bg-${def.color}-500/20 text-${def.color}-400`
                            : "bg-zinc-800 text-zinc-600"
                        }`}
                      >
                        {ACHIEVEMENT_ICONS[type] || <Star className="h-6 w-6" />}
                      </div>
                      <h4 className={`font-medium text-sm ${earned ? "text-white" : "text-zinc-500"}`}>
                        {def.name}
                      </h4>
                      <p className={`text-xs mt-1 ${RARITY_LABELS[def.rarity].color}`}>
                        {RARITY_LABELS[def.rarity].text}
                      </p>
                      <Badge
                        variant={earned ? "success" : "outline"}
                        className="mt-2 text-xs"
                      >
                        +{def.points} pts
                      </Badge>
                    </div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 shadow-xl min-w-[180px]">
                        <p className="text-sm font-medium text-white">{def.name}</p>
                        <p className="text-xs text-zinc-400 mt-1">{def.description}</p>
                        {earned && earnedAchievement && (
                          <p className="text-xs text-emerald-400 mt-2">
                            ✓ Earned {new Date(earnedAchievement.earnedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rarity Legend */}
        <Card variant="glass">
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium text-zinc-400 mb-4">Rarity Legend</h4>
            <div className="flex flex-wrap gap-4">
              {Object.entries(RARITY_LABELS).map(([rarity, { text, color }]) => (
                <div key={rarity} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${
                    rarity === "common" ? "bg-zinc-500" :
                    rarity === "uncommon" ? "bg-green-500" :
                    rarity === "rare" ? "bg-blue-500" :
                    rarity === "epic" ? "bg-emerald-500" :
                    "bg-yellow-500"
                  }`} />
                  <span className={`text-sm ${color}`}>{text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badge Card Modal */}
      {selectedBadge && (
        <BadgeCardModal
          isOpen={isOpen}
          onClose={closeBadgeCard}
          achievementType={selectedBadge.type}
          merchantName={selectedBadge.merchantName}
          earnedAt={selectedBadge.earnedAt}
        />
      )}
    </div>
  );
}
