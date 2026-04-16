'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPointsReasonLabel } from '@/lib/constants/points';

interface PointTransaction {
    id: string;
    amount: number;
    reason: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

interface PointsData {
    balance: number;
    history: PointTransaction[];
    totalEarned: number;
    totalSpent: number;
}

export default function PointsHistoryPage() {
    const [data, setData] = useState<PointsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');

    useEffect(() => {
        async function fetchPoints() {
            try {
                const res = await fetch('/api/points');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch points:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchPoints();
    }, []);

    const filteredHistory = data?.history.filter((tx) => {
        if (filter === 'earned') return tx.amount > 0;
        if (filter === 'spent') return tx.amount < 0;
        return true;
    }) || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-48 bg-zinc-800 rounded" />
                        <div className="h-32 bg-zinc-800 rounded-xl" />
                        <div className="h-64 bg-zinc-800 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold mb-2">Sera Points</h1>
                    <p className="text-zinc-400">Earn points by using Sera and redeem them for rewards</p>
                </div>

                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-[#0d9488]/20 to-[#1a365d]/20 border border-[#0d9488]/30 rounded-2xl p-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-zinc-400 text-sm mb-1">Your Balance</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-[#0d9488]">
                                    {data?.balance.toLocaleString() || 0}
                                </span>
                                <span className="text-xl text-zinc-400">pts</span>
                            </div>
                        </div>
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                            className="text-6xl"
                        >
                            ✨
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                        <div>
                            <p className="text-zinc-400 text-sm">Total Earned</p>
                            <p className="text-2xl font-bold text-emerald-400">
                                +{data?.totalEarned?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Total Spent</p>
                            <p className="text-2xl font-bold text-red-400">
                                -{Math.abs(data?.totalSpent || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <div className="flex gap-4">
                    <a
                        href="/dashboard/rewards"
                        className="flex-1 bg-[#0d9488] hover:bg-[#0d9488]/80 text-white rounded-xl p-4 text-center font-medium transition-colors"
                    >
                        🎁 Redeem Points
                    </a>
                    <a
                        href="/dashboard/referrals"
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl p-4 text-center font-medium transition-colors"
                    >
                        👥 Earn More Points
                    </a>
                </div>

                {/* History Section */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">Points History</h2>
                        <div className="flex gap-2">
                            {(['all', 'earned', 'spent'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                            ? 'bg-[#0d9488] text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <p className="text-4xl mb-4">📭</p>
                            <p>No transactions yet</p>
                            <p className="text-sm mt-2">Start earning points by completing actions!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {filteredHistory.map((tx, index) => (
                                    <motion.div
                                        key={tx.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${tx.amount > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                                    }`}
                                            >
                                                {tx.amount > 0 ? '📈' : '📉'}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {getPointsReasonLabel(tx.reason)}
                                                </p>
                                                <p className="text-sm text-zinc-500">
                                                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            className={`text-lg font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}
                                        >
                                            {tx.amount > 0 ? '+' : ''}
                                            {tx.amount.toLocaleString()}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* How to Earn Points */}
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">How to Earn Points</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { action: 'Complete onboarding', points: 100, icon: '🎯' },
                            { action: 'Create first invoice', points: 50, icon: '📄' },
                            { action: 'Receive first payment', points: 100, icon: '💰' },
                            { action: 'Enable passkey auth', points: 25, icon: '🔐' },
                            { action: 'Successful referral', points: 500, icon: '👥' },
                            { action: 'Connect integration', points: 100, icon: '🔗' },
                            { action: '7-day login streak', points: 50, icon: '🔥' },
                            { action: 'Complete profile', points: 50, icon: '✅' },
                        ].map((item) => (
                            <div
                                key={item.action}
                                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="text-zinc-300">{item.action}</span>
                                </div>
                                <span className="text-[#0d9488] font-medium">+{item.points} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
