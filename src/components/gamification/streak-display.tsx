'use client';

import { motion } from 'framer-motion';

interface StreakDisplayProps {
    currentStreak: number;
    longestStreak: number;
    streakIncreased?: boolean;
    compact?: boolean;
}

/**
 * Streak Display Component
 * Shows the user's current login streak with fire emoji animation
 */
export function StreakDisplay({
    currentStreak,
    longestStreak,
    streakIncreased = false,
    compact = false,
}: StreakDisplayProps) {
    // Determine fire intensity based on streak length
    const getFireEmoji = () => {
        if (currentStreak >= 30) return '🔥🔥🔥';
        if (currentStreak >= 14) return '🔥🔥';
        if (currentStreak >= 7) return '🔥';
        return '🔥';
    };

    const getStreakColor = () => {
        if (currentStreak >= 30) return 'text-red-400';
        if (currentStreak >= 14) return 'text-orange-400';
        if (currentStreak >= 7) return 'text-amber-400';
        return 'text-zinc-400';
    };

    const getStreakMessage = () => {
        if (currentStreak >= 30) return "You're on fire!";
        if (currentStreak >= 14) return 'Amazing streak!';
        if (currentStreak >= 7) return 'Great streak!';
        if (currentStreak >= 3) return 'Nice streak!';
        if (currentStreak > 0) return 'Keep going!';
        return 'Start a streak';
    };

    if (compact) {
        return (
            <motion.div
                initial={{ scale: 1 }}
                animate={streakIncreased ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                className={`flex items-center gap-1.5 ${getStreakColor()}`}
            >
                <motion.span
                    animate={
                        currentStreak > 0
                            ? {
                                y: [0, -2, 0],
                                scale: [1, 1.1, 1],
                            }
                            : {}
                    }
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                    {getFireEmoji()}
                </motion.span>
                <span className="font-bold text-lg">{currentStreak}</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Animated fire icon */}
                    <motion.div
                        animate={
                            currentStreak > 0
                                ? {
                                    y: [0, -3, 0],
                                    scale: [1, 1.1, 1],
                                }
                                : {}
                        }
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                        className="text-3xl"
                    >
                        {getFireEmoji()}
                    </motion.div>

                    <div>
                        <div className={`text-2xl font-bold ${getStreakColor()}`}>
                            {currentStreak} day{currentStreak !== 1 ? 's' : ''}
                        </div>
                        <p className="text-sm text-zinc-500">{getStreakMessage()}</p>
                    </div>
                </div>

                {/* Streak increased animation */}
                {streakIncreased && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                        className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium"
                    >
                        +1 🎉
                    </motion.div>
                )}
            </div>

            {/* Best streak indicator */}
            {longestStreak > currentStreak && longestStreak > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Best streak</span>
                    <span className="text-xs text-zinc-400 font-medium">
                        {longestStreak} days 👑
                    </span>
                </div>
            )}

            {/* Progress bar to next milestone */}
            {currentStreak > 0 && currentStreak < 30 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Progress to {currentStreak < 7 ? '7' : currentStreak < 30 ? '30' : '30'}-day streak</span>
                        <span>
                            {currentStreak}/{currentStreak < 7 ? 7 : 30} days
                        </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(currentStreak / (currentStreak < 7 ? 7 : 30)) * 100}%`,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full rounded-full ${currentStreak >= 7 ? 'bg-orange-500' : 'bg-amber-500'
                                }`}
                        />
                    </div>
                </div>
            )}

            {/* Achievement unlocked message */}
            {currentStreak === 7 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-white/5 text-center text-sm text-amber-400"
                >
                    🎖️ Weekly Warrior badge unlocked! +50 points
                </motion.div>
            )}
            {currentStreak === 30 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-white/5 text-center text-sm text-red-400"
                >
                    🔥 Monthly Master badge unlocked! +200 points
                </motion.div>
            )}
        </motion.div>
    );
}

/**
 * Streak Broken Notification
 * Shows when a user's streak was broken
 */
export function StreakBrokenNotification({
    previousStreak,
    onDismiss,
}: {
    previousStreak: number;
    onDismiss: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-zinc-900 border border-red-500/30 rounded-xl p-4 shadow-lg max-w-sm"
        >
            <div className="flex items-start gap-3">
                <div className="text-2xl">😢</div>
                <div className="flex-1">
                    <h4 className="font-bold text-white">Streak Broken</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                        Your {previousStreak}-day streak was lost. Don&apos;t worry, you can start a new one today!
                    </p>
                </div>
                <button
                    onClick={onDismiss}
                    className="text-zinc-500 hover:text-white transition-colors"
                >
                    ×
                </button>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 text-center">
                <span className="text-sm text-[#0d9488]">
                    New streak: 1 day 🔥
                </span>
            </div>
        </motion.div>
    );
}

export default StreakDisplay;
