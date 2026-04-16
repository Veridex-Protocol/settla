'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { REWARD_CATALOG } from '@/lib/constants/points';

interface UserPoints {
    balance: number;
}

interface RedemptionHistory {
    id: string;
    rewardId: string;
    rewardName: string;
    pointsCost: number;
    redeemedAt: string;
    status: 'pending' | 'completed' | 'failed';
}

export default function RewardsStorePage() {
    const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
    const [redemptions, setRedemptions] = useState<RedemptionHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeeming, setRedeeming] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [pointsRes, redemptionsRes] = await Promise.all([
                    fetch('/api/points'),
                    fetch('/api/rewards/history'),
                ]);

                if (pointsRes.ok) {
                    const data = await pointsRes.json();
                    setUserPoints({ balance: data.balance });
                }

                if (redemptionsRes.ok) {
                    const data = await redemptionsRes.json();
                    setRedemptions(data.redemptions || []);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleRedeem = async (rewardId: string) => {
        const reward = REWARD_CATALOG.find(r => r.id === rewardId);
        if (!reward || !userPoints || userPoints.balance < reward.pointsCost) return;

        setRedeeming(rewardId);
        try {
            const res = await fetch('/api/rewards/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rewardId }),
            });

            if (res.ok) {
                const data = await res.json();
                setUserPoints(prev => prev ? { balance: prev.balance - reward.pointsCost } : null);
                setRedemptions(prev => [data.redemption, ...prev]);
                setSuccessMessage(`Successfully redeemed ${reward.name}!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to redeem reward');
            }
        } catch (error) {
            console.error('Redemption failed:', error);
            alert('Failed to redeem reward');
        } finally {
            setRedeeming(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-10 w-48 bg-zinc-800 rounded" />
                        <div className="h-24 bg-zinc-800 rounded-xl" />
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-48 bg-zinc-800 rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const categories = [...new Set(REWARD_CATALOG.map(r => r.category))];

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Success Message */}
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-4 right-4 bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
                    >
                        🎉 {successMessage}
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Rewards Store</h1>
                        <p className="text-zinc-400">Redeem your Sera Points for exclusive rewards</p>
                    </div>
                    <a
                        href="/dashboard/points"
                        className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        View Points History →
                    </a>
                </div>

                {/* Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#0d9488]/20 to-[#1a365d]/20 border border-[#0d9488]/30 rounded-xl p-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-zinc-400 text-sm">Available Points</p>
                            <p className="text-4xl font-bold text-[#0d9488]">
                                {userPoints?.balance.toLocaleString() || 0}
                                <span className="text-lg text-zinc-400 ml-2">pts</span>
                            </p>
                        </div>
                        <span className="text-5xl">🛍️</span>
                    </div>
                </motion.div>

                {/* Rewards Grid */}
                {categories.map(category => (
                    <div key={category} className="space-y-4">
                        <h2 className="text-xl font-bold capitalize">
                            {category === 'fee_credits' ? '💳 Fee Credits' :
                                category === 'support' ? '🎫 Support' :
                                    category === 'features' ? '🚀 Features' : category}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {REWARD_CATALOG.filter(r => r.category === category && r.active).map((reward, index) => {
                                const canAfford = (userPoints?.balance || 0) >= reward.pointsCost;
                                const isRedeeming = redeeming === reward.id;

                                return (
                                    <motion.div
                                        key={reward.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`
                      relative overflow-hidden rounded-xl border p-6 transition-all
                      ${canAfford
                                                ? 'bg-zinc-900/50 border-[#0d9488]/30 hover:border-[#0d9488]/60'
                                                : 'bg-zinc-900/30 border-white/5 opacity-60'
                                            }
                    `}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="text-4xl">{reward.icon}</span>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-[#0d9488]">
                                                    {reward.pointsCost.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-zinc-500">pts</p>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold mb-2">{reward.name}</h3>
                                        <p className="text-sm text-zinc-400 mb-4">{reward.description}</p>

                                        <button
                                            onClick={() => handleRedeem(reward.id)}
                                            disabled={!canAfford || isRedeeming}
                                            className={`
                        w-full py-3 rounded-lg font-medium transition-all
                        ${canAfford
                                                    ? 'bg-[#0d9488] hover:bg-[#0d9488]/80 text-white'
                                                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                }
                      `}
                                        >
                                            {isRedeeming ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <motion.span
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                    >
                                                        ⏳
                                                    </motion.span>
                                                    Redeeming...
                                                </span>
                                            ) : canAfford ? (
                                                'Redeem'
                                            ) : (
                                                `Need ${(reward.pointsCost - (userPoints?.balance || 0)).toLocaleString()} more pts`
                                            )}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Redemption History */}
                {redemptions.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Recent Redemptions</h2>
                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl divide-y divide-white/5">
                            {redemptions.slice(0, 5).map((redemption) => (
                                <div key={redemption.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{redemption.rewardName}</p>
                                        <p className="text-sm text-zinc-500">
                                            {new Date(redemption.redeemedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-zinc-400">-{redemption.pointsCost} pts</span>
                                        <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${redemption.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                redemption.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'}
                    `}>
                                            {redemption.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
