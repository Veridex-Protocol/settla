'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPointsReasonLabel } from '@/lib/constants/points';

interface PointsNotification {
    id: string;
    amount: number;
    reason: string;
}

// Event emitter for points notifications
const pointsEventListeners: Set<(notification: PointsNotification) => void> = new Set();

/**
 * Trigger a points earned notification (call from anywhere)
 */
export function showPointsNotification(amount: number, reason: string) {
    const notification: PointsNotification = {
        id: `${Date.now()}-${Math.random()}`,
        amount,
        reason,
    };
    pointsEventListeners.forEach(listener => listener(notification));
}

/**
 * Points Notification Toast Provider
 * Add this component to your layout to enable points notifications
 */
export function PointsNotificationProvider() {
    const [notifications, setNotifications] = useState<PointsNotification[]>([]);

    const addNotification = useCallback((notification: PointsNotification) => {
        setNotifications(prev => [...prev, notification]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 4000);
    }, []);

    useEffect(() => {
        pointsEventListeners.add(addNotification);
        return () => {
            pointsEventListeners.delete(addNotification);
        };
    }, [addNotification]);

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                    <PointsToast
                        key={notification.id}
                        amount={notification.amount}
                        reason={notification.reason}
                        onClose={() => {
                            setNotifications(prev => prev.filter(n => n.id !== notification.id));
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

interface PointsToastProps {
    amount: number;
    reason: string;
    onClose: () => void;
}

function PointsToast({ amount, reason, onClose }: PointsToastProps) {
    const isPositive = amount > 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto"
        >
            <div
                className={`
          flex items-center gap-4 px-5 py-4 rounded-xl shadow-lg backdrop-blur-md
          border cursor-pointer transition-transform hover:scale-[1.02]
          ${isPositive
                        ? 'bg-emerald-500/20 border-emerald-500/30'
                        : 'bg-red-500/20 border-red-500/30'
                    }
        `}
                onClick={onClose}
            >
                {/* Animated Icon */}
                <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    className={`
            w-12 h-12 rounded-full flex items-center justify-center text-2xl
            ${isPositive ? 'bg-emerald-500/30' : 'bg-red-500/30'}
          `}
                >
                    {isPositive ? '✨' : '💸'}
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">
                        {getPointsReasonLabel(reason)}
                    </p>
                    <p className="text-sm text-zinc-400">Sera Points</p>
                </div>

                {/* Points Amount */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                    className={`
            text-2xl font-bold
            ${isPositive ? 'text-emerald-400' : 'text-red-400'}
          `}
                >
                    {isPositive ? '+' : ''}{amount.toLocaleString()}
                </motion.div>

                {/* Sparkle Effects for positive amounts */}
                {isPositive && (
                    <>
                        <motion.div
                            className="absolute -top-1 -right-1 text-yellow-400 text-sm"
                            animate={{
                                y: [0, -10, 0],
                                opacity: [1, 0.5, 1],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            ⭐
                        </motion.div>
                        <motion.div
                            className="absolute top-1/2 -left-2 text-yellow-400 text-xs"
                            animate={{
                                y: [0, -8, 0],
                                opacity: [0.7, 1, 0.7],
                            }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                        >
                            ✦
                        </motion.div>
                    </>
                )}
            </div>
        </motion.div>
    );
}

export default PointsNotificationProvider;
