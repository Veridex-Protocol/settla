'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type ComparisonCardProps = {
    title: string;
    icon: React.ReactNode;
    competitors: { name: string; value: string; visualPercent?: number }[];
    settla: { value: string; visualPercent?: number; tooltip?: string };
    type: 'time' | 'risk' | 'control';
};

const ComparisonCard = ({ title, icon, competitors, settla, type }: ComparisonCardProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className="relative p-6 rounded-2xl bg-zinc-900/50 border border-white/5 overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ scale: 1.02, borderColor: 'rgba(13, 148, 136, 0.3)' }}
            transition={{ duration: 0.2 }}
        >
            {/* Background glow on hover */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[#0d9488]/5 to-transparent pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
            />

            {/* Main Content */}
            <motion.div
                animate={{ filter: isHovered && settla.tooltip ? 'blur(4px)' : 'blur(0px)', opacity: isHovered && settla.tooltip ? 0.6 : 1 }}
                transition={{ duration: 0.2 }}
            >
                {/* Header */}
                <div className="flex items-center gap-2 text-zinc-500 text-sm mb-5 relative z-10">
                    <span className="text-zinc-600">{icon}</span>
                    {title}
                </div>

                {/* Competitor rows */}
                <div className="space-y-3 relative z-10">
                    {competitors.map((comp, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <span className="text-zinc-400 text-sm">{comp.name}</span>
                            <div className="flex items-center gap-3">
                                {type === 'time' && comp.visualPercent !== undefined && (
                                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-red-500/60 rounded-full"
                                            initial={{ width: 0 }}
                                            whileInView={{ width: `${comp.visualPercent}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                                        />
                                    </div>
                                )}
                                {type === 'risk' && (
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3].map((dot) => (
                                            <motion.div
                                                key={dot}
                                                className={`w-1.5 h-1.5 rounded-full ${dot <= 2 ? 'bg-red-400' : 'bg-zinc-700'}`}
                                                initial={{ scale: 0 }}
                                                whileInView={{ scale: 1 }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.3, delay: dot * 0.1 }}
                                            />
                                        ))}
                                    </div>
                                )}
                                {type === 'control' && (
                                    <motion.svg
                                        className="w-4 h-4 text-red-400/60"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        viewport={{ once: true }}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </motion.svg>
                                )}
                                <span className="text-red-400 font-mono text-sm">{comp.value}</span>
                            </div>
                        </div>
                    ))}

                    {/* Settla row - the hero */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <span className="text-white text-sm font-medium">Settla</span>
                        <div className="flex items-center gap-3">
                            {type === 'time' && (
                                <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-[#0d9488] rounded-full"
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${settla.visualPercent || 3}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: 0.3 }}
                                    />
                                </div>
                            )}
                            {type === 'risk' && (
                                <motion.svg
                                    className="w-4 h-4 text-[#0d9488]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    initial={{ scale: 0, rotate: -180 }}
                                    whileInView={{ scale: 1, rotate: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, type: "spring" }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </motion.svg>
                            )}
                            {type === 'control' && (
                                <motion.svg
                                    className="w-4 h-4 text-[#0d9488]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </motion.svg>
                            )}
                            <span className="text-[#0d9488] font-bold">{settla.value}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tooltip on hover */}
            {settla.tooltip && (
                <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 to-transparent p-4 pt-8"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                    transition={{ duration: 0.2 }}
                >
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        {settla.tooltip}
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
};

export const FeatureComparisonGrid = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white text-center mb-8">But wait, there&apos;s more...</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Settlement Time */}
                <ComparisonCard
                    title="Settlement time"
                    icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    type="time"
                    competitors={[
                        { name: 'Stripe', value: '2-7 days', visualPercent: 100 },
                        { name: 'PayPal', value: '3-5 days', visualPercent: 70 },
                    ]}
                    settla={{
                        value: '~2 min',
                        visualPercent: 2,
                        tooltip: "Blockchain finality means your money is yours the moment the transaction confirms. No waiting, no holding periods."
                    }}
                />

                {/* Chargeback Risk */}
                <ComparisonCard
                    title="Chargeback risk"
                    icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    }
                    type="risk"
                    competitors={[
                        { name: 'Stripe', value: '$15/dispute' },
                        { name: 'PayPal', value: '$20/dispute' },
                    ]}
                    settla={{
                        value: 'Impossible',
                        tooltip: "Stablecoin payments are final. Once confirmed on-chain, there's no mechanism for chargebacks or disputes."
                    }}
                />

                {/* Account Control */}
                <ComparisonCard
                    title="Account control"
                    icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    }
                    type="control"
                    competitors={[
                        { name: 'Stripe', value: 'Can freeze' },
                        { name: 'PayPal', value: 'Often holds' },
                    ]}
                    settla={{
                        value: 'Your keys',
                        tooltip: "Self-custody means you control your funds. No third party can freeze, hold, or restrict your access."
                    }}
                />
            </div>
        </div>
    );
};
