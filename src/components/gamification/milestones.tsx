"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Sparkles, 
    Trophy, 
    Flame, 
    Star, 
    Crown, 
    Zap, 
    Gift,
    Lock,
    Check,
    ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface Milestone {
    id: string;
    name: string;
    description: string;
    type: "transactions" | "volume" | "revenue" | "streak";
    threshold: number;
    reward: {
        type: string;
        value: number;
        durationDays?: number;
        description: string;
    };
    icon: string;
    current: number;
    achieved: boolean;
    achievedAt?: string;
}

interface ActiveRewards {
    feeDiscount: number;
    isFeatured: boolean;
    featuredLevel: number;
    hasPrioritySupport: boolean;
}

interface MilestoneData {
    milestones: Milestone[];
    activeRewards: ActiveRewards;
    summary: {
        total: number;
        achieved: number;
        inProgress: number;
        completionRate: number;
    };
}

// ============================================================================
// Milestone Card Component
// ============================================================================

function MilestoneCard({ milestone, index }: { milestone: Milestone; index: number }) {
    const progressPercent = Math.min((milestone.current / milestone.threshold) * 100, 100);
    const isClose = progressPercent >= 75 && !milestone.achieved;
    
    const getRewardTypeIcon = (type: string) => {
        switch (type) {
            case "fee_discount":
                return <Gift className="h-4 w-4" />;
            case "featured_merchant":
                return <Star className="h-4 w-4" />;
            case "priority_support":
                return <Zap className="h-4 w-4" />;
            default:
                return <Sparkles className="h-4 w-4" />;
        }
    };

    const getRewardColor = (type: string) => {
        switch (type) {
            case "fee_discount":
                return "text-green-500";
            case "featured_merchant":
                return "text-amber-500";
            case "priority_support":
                return "text-blue-500";
            default:
                return "text-purple-500";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card
                className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    milestone.achieved 
                        ? "border-emerald-500/50 bg-emerald-500/5" 
                        : isClose 
                            ? "border-amber-500/50" 
                            : "hover:border-primary/30"
                )}
            >
                {/* Achievement glow effect */}
                {milestone.achieved && (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
                )}
                
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                            className={cn(
                                "flex items-center justify-center w-12 h-12 rounded-full text-2xl",
                                milestone.achieved 
                                    ? "bg-emerald-500/20" 
                                    : "bg-muted"
                            )}
                        >
                            {milestone.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{milestone.name}</h3>
                                {milestone.achieved && (
                                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                        <Check className="h-3 w-3 mr-1" />
                                        Achieved
                                    </Badge>
                                )}
                                {isClose && !milestone.achieved && (
                                    <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                                        <Flame className="h-3 w-3 mr-1" />
                                        Almost there!
                                    </Badge>
                                )}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-3">
                                {milestone.description}
                            </p>

                            {/* Progress */}
                            {!milestone.achieved && (
                                <div className="mb-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className={cn(
                                            "font-medium",
                                            isClose && "text-amber-600"
                                        )}>
                                            {milestone.type === "volume" 
                                                ? `$${milestone.current.toLocaleString()} / $${milestone.threshold.toLocaleString()}`
                                                : `${milestone.current} / ${milestone.threshold}`
                                            }
                                        </span>
                                    </div>
                                    <Progress 
                                        value={progressPercent} 
                                        className={cn(
                                            "h-2",
                                            isClose && "[&>div]:bg-amber-500"
                                        )}
                                    />
                                </div>
                            )}

                            {/* Reward */}
                            <div className={cn(
                                "flex items-center gap-2 text-sm",
                                getRewardColor(milestone.reward.type)
                            )}>
                                {getRewardTypeIcon(milestone.reward.type)}
                                <span>{milestone.reward.description}</span>
                            </div>

                            {/* Achievement date */}
                            {milestone.achieved && milestone.achievedAt && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Achieved on {new Date(milestone.achievedAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ============================================================================
// Active Rewards Banner
// ============================================================================

function ActiveRewardsBanner({ rewards }: { rewards: ActiveRewards }) {
    const hasRewards = rewards.feeDiscount > 0 || rewards.isFeatured || rewards.hasPrioritySupport;
    
    if (!hasRewards) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Card className="border-gradient-to-r from-amber-500/30 to-purple-500/30 bg-gradient-to-r from-amber-500/5 to-purple-500/5">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Crown className="h-5 w-5 text-amber-500" />
                        <h3 className="font-semibold">Active Rewards</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {rewards.feeDiscount > 0 && (
                            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                <Gift className="h-3 w-3 mr-1" />
                                {rewards.feeDiscount}% Fee Discount
                            </Badge>
                        )}
                        
                        {rewards.isFeatured && (
                            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                                <Star className="h-3 w-3 mr-1" />
                                Featured Merchant (Level {rewards.featuredLevel})
                            </Badge>
                        )}
                        
                        {rewards.hasPrioritySupport && (
                            <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                                <Zap className="h-3 w-3 mr-1" />
                                Priority Support
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ============================================================================
// Summary Stats
// ============================================================================

function SummaryStats({ summary }: { summary: MilestoneData["summary"] }) {
    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-emerald-500">{summary.achieved}</div>
                <div className="text-xs text-muted-foreground">Achieved</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-amber-500">{summary.inProgress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">{summary.completionRate}%</div>
                <div className="text-xs text-muted-foreground">Completion</div>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function MilestonesWidget() {
    const [data, setData] = useState<MilestoneData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "achieved" | "in-progress">("all");

    useEffect(() => {
        fetchMilestones();
    }, []);

    const fetchMilestones = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/milestones");
            if (!res.ok) throw new Error("Failed to fetch milestones");
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error("Failed to fetch milestones:", err);
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    };

    const filteredMilestones = data?.milestones.filter(m => {
        if (filter === "achieved") return m.achieved;
        if (filter === "in-progress") return !m.achieved && m.current > 0;
        return true;
    });

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">{error || "No data available"}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Active Rewards */}
            <ActiveRewardsBanner rewards={data.activeRewards} />

            {/* Milestones Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                Milestones
                            </CardTitle>
                            <CardDescription>
                                Complete milestones to unlock rewards
                            </CardDescription>
                        </div>
                        
                        {/* Filter buttons */}
                        <div className="flex gap-1">
                            {(["all", "in-progress", "achieved"] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={cn(
                                        "px-3 py-1 text-xs rounded-full transition-colors",
                                        filter === f 
                                            ? "bg-primary text-primary-foreground" 
                                            : "bg-muted hover:bg-muted/80"
                                    )}
                                >
                                    {f === "all" ? "All" : f === "in-progress" ? "In Progress" : "Achieved"}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Summary */}
                    <SummaryStats summary={data.summary} />

                    {/* Milestones List */}
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredMilestones?.map((milestone, index) => (
                                <MilestoneCard 
                                    key={milestone.id} 
                                    milestone={milestone} 
                                    index={index}
                                />
                            ))}
                        </AnimatePresence>
                        
                        {filteredMilestones?.length === 0 && (
                            <div className="text-center py-8">
                                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">
                                    {filter === "achieved" 
                                        ? "No milestones achieved yet. Keep going!" 
                                        : filter === "in-progress"
                                            ? "No milestones in progress. Start making transactions!"
                                            : "No milestones available."
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// Compact Widget for Dashboard
// ============================================================================

export function MilestonesCompact() {
    const [data, setData] = useState<MilestoneData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/milestones")
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Card>
                <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    // Get closest milestone to completion
    const nextMilestone = data.milestones
        .filter(m => !m.achieved)
        .sort((a, b) => {
            const progressA = a.current / a.threshold;
            const progressB = b.current / b.threshold;
            return progressB - progressA;
        })[0];

    return (
        <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">Milestones</span>
                    </div>
                    <Badge variant="outline">
                        {data.summary.achieved}/{data.summary.total}
                    </Badge>
                </div>

                {nextMilestone && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{nextMilestone.icon}</span>
                            <span className="text-sm text-muted-foreground truncate">
                                {nextMilestone.name}
                            </span>
                        </div>
                        <Progress 
                            value={(nextMilestone.current / nextMilestone.threshold) * 100} 
                            className="h-1.5"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {nextMilestone.type === "volume"
                                    ? `$${nextMilestone.current.toLocaleString()}`
                                    : nextMilestone.current
                                } / {nextMilestone.type === "volume"
                                    ? `$${nextMilestone.threshold.toLocaleString()}`
                                    : nextMilestone.threshold
                                }
                            </span>
                            <ChevronRight className="h-4 w-4" />
                        </div>
                    </div>
                )}

                {data.activeRewards.feeDiscount > 0 && (
                    <div className="mt-3 pt-3 border-t">
                        <Badge className="bg-green-500/20 text-green-600 text-xs">
                            <Gift className="h-3 w-3 mr-1" />
                            {data.activeRewards.feeDiscount}% fee discount active
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default MilestonesWidget;
