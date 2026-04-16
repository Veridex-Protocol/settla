'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
    rank: number;
    displayName: string;
    value: number;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
    isCurrentUser?: boolean;
}

type LeaderboardCategory = 'volume' | 'growth' | 'consistency' | 'conversion';

const CATEGORY_CONFIG = {
    volume: {
        label: 'Top Volume',
        icon: '💰',
        description: 'Highest processing volume this month',
        format: (v: number) => `$${(v / 1000).toFixed(1)}k`,
    },
    growth: {
        label: 'Fastest Growing',
        icon: '📈',
        description: 'Highest month-over-month growth',
        format: (v: number) => `+${v}%`,
    },
    consistency: {
        label: 'Most Consistent',
        icon: '🎯',
        description: 'Longest streak of daily activity',
        format: (v: number) => `${v} days`,
    },
    conversion: {
        label: 'Best Conversion',
        icon: '✨',
        description: 'Highest payment link conversion rate',
        format: (v: number) => `${v}%`,
    },
};

const TIER_BADGES: Record<string, { icon: string; color: string }> = {
    BRONZE: { icon: '🥉', color: 'text-amber-600' },
    SILVER: { icon: '🥈', color: 'text-zinc-300' },
    GOLD: { icon: '🥇', color: 'text-amber-400' },
    DIAMOND: { icon: '💎', color: 'text-cyan-400' },
};

export default function LeaderboardPage() {
    const [category, setCategory] = useState<LeaderboardCategory>('volume');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [optedIn, setOptedIn] = useState(false);
    const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

    useEffect(() => {
        async function fetchLeaderboard() {
            setLoading(true);
            try {
                const res = await fetch(`/api/leaderboard?category=${category}`);
                if (res.ok) {
                    const data = await res.json();
                    setEntries(data.entries || []);
                    setOptedIn(data.optedIn || false);
                    setUserRank(data.userRank || null);
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();
    }, [category]);

    const toggleOptIn = async () => {
        try {
            const res = await fetch('/api/leaderboard/opt-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ optIn: !optedIn }),
            });
            if (res.ok) {
                setOptedIn(!optedIn);
            }
        } catch (error) {
            console.error('Failed to toggle opt-in:', error);
        }
    };

    const categoryConfig = CATEGORY_CONFIG[category];

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
                    <p className="text-zinc-400">See how you rank among Sera merchants</p>
                </div>

                {/* Category Tabs */}
                <div className="flex justify-center gap-2 flex-wrap">
                    {(Object.keys(CATEGORY_CONFIG) as LeaderboardCategory[]).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${category === cat
                                    ? 'bg-[#0d9488] text-white'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                        >
                            <span className="mr-2">{CATEGORY_CONFIG[cat].icon}</span>
                            {CATEGORY_CONFIG[cat].label}
                        </button>
                    ))}
                </div>

                {/* Category Description */}
                <div className="text-center text-zinc-500 text-sm">
                    {categoryConfig.description}
                </div>

                {/* Opt-in Toggle */}
                <div className="flex items-center justify-center gap-4 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                    <span className="text-sm text-zinc-400">Show my business on leaderboard</span>
                    <button
                        onClick={toggleOptIn}
                        className={`relative w-12 h-6 rounded-full transition-colors ${optedIn ? 'bg-[#0d9488]' : 'bg-zinc-700'
                            }`}
                    >
                        <motion.div
                            animate={{ x: optedIn ? 24 : 2 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full"
                        />
                    </button>
                </div>

                {/* Leaderboard List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-16 text-zinc-500">
                        <p className="text-4xl mb-4">🏆</p>
                        <p className="text-lg">No entries yet</p>
                        <p className="text-sm mt-2">Be the first to appear on the leaderboard!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry, index) => (
                            <motion.div
                                key={`${entry.rank}-${entry.displayName}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex items-center justify-between p-4 rounded-xl border ${entry.isCurrentUser
                                        ? 'bg-[#0d9488]/10 border-[#0d9488]/30'
                                        : 'bg-zinc-900/50 border-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank */}
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold">
                                        {entry.rank <= 3 ? (
                                            <span className="text-xl">
                                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-400">{entry.rank}</span>
                                        )}
                                    </div>

                                    {/* Name & Tier */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {entry.displayName}
                                                {entry.isCurrentUser && (
                                                    <span className="text-[#0d9488] ml-2">(You)</span>
                                                )}
                                            </span>
                                            <span className={TIER_BADGES[entry.tier].color}>
                                                {TIER_BADGES[entry.tier].icon}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500">{entry.tier} Tier</p>
                                    </div>
                                </div>

                                {/* Value */}
                                <div className="text-right">
                                    <p className="text-lg font-bold text-[#0d9488]">
                                        {categoryConfig.format(entry.value)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* User's Rank (if not in top 10) */}
                {userRank && !entries.some((e) => e.isCurrentUser) && (
                    <div className="border-t border-white/5 pt-4">
                        <p className="text-sm text-zinc-500 mb-2">Your Rank</p>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[#0d9488]/10 border border-[#0d9488]/30">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                                    {userRank.rank}
                                </div>
                                <div>
                                    <span className="font-medium">{userRank.displayName} (You)</span>
                                    <p className="text-xs text-zinc-500">{userRank.tier} Tier</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-[#0d9488]">
                                    {categoryConfig.format(userRank.value)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Privacy Notice */}
                <div className="text-center text-xs text-zinc-600 pt-8">
                    <p>
                        🔒 Leaderboard is opt-in only. Your business name is shown anonymized
                        unless you choose to display it.
                    </p>
                </div>
            </div>
        </div>
    );
}
