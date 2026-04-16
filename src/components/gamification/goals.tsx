'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Goal {
    id: string;
    type: 'revenue' | 'invoices' | 'payment_links' | 'team';
    title: string;
    targetValue: number;
    currentValue: number;
    deadline: string;
    achieved: boolean;
}

const GOAL_TYPES = {
    revenue: {
        label: 'Revenue',
        icon: '💰',
        color: 'emerald',
        format: (value: number) => `$${value.toLocaleString()}`,
    },
    invoices: {
        label: 'Invoices Sent',
        icon: '📄',
        color: 'blue',
        format: (value: number) => value.toString(),
    },
    payment_links: {
        label: 'Payment Links',
        icon: '🔗',
        color: 'purple',
        format: (value: number) => value.toString(),
    },
    team: {
        label: 'Team Members',
        icon: '👥',
        color: 'cyan',
        format: (value: number) => value.toString(),
    },
};

interface GoalSettingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (goal: Omit<Goal, 'id' | 'currentValue' | 'achieved'>) => Promise<void>;
}

/**
 * Goal Setting Modal
 * Allows users to create new goals
 */
export function GoalSettingModal({ isOpen, onClose, onSubmit }: GoalSettingModalProps) {
    const [type, setType] = useState<Goal['type']>('revenue');
    const [title, setTitle] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [deadline, setDeadline] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !targetValue || !deadline) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                type,
                title,
                targetValue: parseFloat(targetValue),
                deadline,
            });
            onClose();
            setTitle('');
            setTargetValue('');
            setDeadline('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const goalType = GOAL_TYPES[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
                    >
                        <h2 className="text-xl font-bold mb-4">Set a New Goal</h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Goal Type */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Goal Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(GOAL_TYPES) as Goal['type'][]).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t)}
                                            className={`p-3 rounded-lg border text-left transition-all ${type === t
                                                    ? 'bg-[#0d9488]/20 border-[#0d9488]'
                                                    : 'bg-zinc-800 border-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <span className="text-lg">{GOAL_TYPES[t].icon}</span>
                                            <span className="ml-2 text-sm">{GOAL_TYPES[t].label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Goal Title */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Goal Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={`e.g., "January ${goalType.label} Goal"`}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:border-[#0d9488] focus:outline-none"
                                />
                            </div>

                            {/* Target Value */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">
                                    Target {type === 'revenue' ? 'Amount ($)' : 'Count'}
                                </label>
                                <input
                                    type="number"
                                    value={targetValue}
                                    onChange={(e) => setTargetValue(e.target.value)}
                                    placeholder={type === 'revenue' ? '10000' : '50'}
                                    min="1"
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:border-[#0d9488] focus:outline-none"
                                />
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="block text-sm text-zinc-400 mb-2">Deadline</label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:border-[#0d9488] focus:outline-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!title || !targetValue || !deadline || isSubmitting}
                                    className="flex-1 px-4 py-3 bg-[#0d9488] text-white rounded-lg hover:bg-[#0d9488]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Goal'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

interface GoalProgressWidgetProps {
    goals: Goal[];
    onAddGoal: () => void;
}

/**
 * Goal Progress Widget
 * Displays active goals with progress bars on the dashboard
 */
export function GoalProgressWidget({ goals, onAddGoal }: GoalProgressWidgetProps) {
    const activeGoals = goals.filter((g) => !g.achieved);
    const achievedGoals = goals.filter((g) => g.achieved);

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Your Goals</h3>
                <button
                    onClick={onAddGoal}
                    className="text-sm text-[#0d9488] hover:text-[#0d9488]/80 transition-colors"
                >
                    + Add Goal
                </button>
            </div>

            {activeGoals.length === 0 && achievedGoals.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                    <p className="text-3xl mb-2">🎯</p>
                    <p>No goals set yet</p>
                    <button
                        onClick={onAddGoal}
                        className="mt-3 text-[#0d9488] text-sm hover:underline"
                    >
                        Set your first goal
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeGoals.map((goal, index) => (
                        <GoalCard key={goal.id} goal={goal} index={index} />
                    ))}

                    {achievedGoals.length > 0 && (
                        <div className="pt-4 border-t border-white/5">
                            <p className="text-xs text-zinc-500 mb-2">Recently Achieved</p>
                            {achievedGoals.slice(0, 2).map((goal) => (
                                <div
                                    key={goal.id}
                                    className="flex items-center gap-2 text-sm text-emerald-400 py-1"
                                >
                                    <span>✅</span>
                                    <span>{goal.title}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
    const goalType = GOAL_TYPES[goal.type];
    const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
    const daysLeft = Math.max(
        0,
        Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-zinc-800/50 rounded-xl"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{goalType.icon}</span>
                    <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-xs text-zinc-500">
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-bold text-${goalType.color}-400`}>
                        {goalType.format(goal.currentValue)}
                    </p>
                    <p className="text-xs text-zinc-500">
                        of {goalType.format(goal.targetValue)}
                    </p>
                </div>
            </div>

            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-${goalType.color}-500`}
                    style={{
                        backgroundColor:
                            goalType.color === 'emerald'
                                ? '#10b981'
                                : goalType.color === 'blue'
                                    ? '#3b82f6'
                                    : goalType.color === 'purple'
                                        ? '#8b5cf6'
                                        : '#06b6d4',
                    }}
                />
            </div>

            <p className="text-xs text-zinc-500 mt-2 text-right">{Math.round(progress)}% complete</p>
        </motion.div>
    );
}

/**
 * Goal Achieved Celebration
 * Shows when a goal is completed
 */
export function GoalAchievedCelebration({
    goal,
    onDismiss,
}: {
    goal: Goal;
    onDismiss: () => void;
}) {
    const goalType = GOAL_TYPES[goal.type];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onDismiss}
        >
            <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-emerald-500/20 to-[#0d9488]/20 border border-emerald-500/30 rounded-2xl p-8 text-center max-w-sm"
            >
                <motion.div
                    animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                    className="text-6xl mb-4"
                >
                    🎉
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2">Goal Achieved!</h2>
                <p className="text-zinc-400 mb-4">{goal.title}</p>

                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-400 mb-6">
                    <span>{goalType.icon}</span>
                    <span>{goalType.format(goal.targetValue)}</span>
                </div>

                <div className="bg-emerald-500/20 rounded-lg p-3 mb-6">
                    <p className="text-sm text-emerald-400">+100 Sera Points earned 🌟</p>
                </div>

                <button
                    onClick={onDismiss}
                    className="w-full px-6 py-3 bg-[#0d9488] text-white rounded-lg hover:bg-[#0d9488]/80 transition-colors font-medium"
                >
                    Celebrate! 🎊
                </button>
            </motion.div>
        </motion.div>
    );
}

export default GoalProgressWidget;
