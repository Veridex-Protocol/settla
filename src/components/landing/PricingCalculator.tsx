'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';


export const PricingCalculator = () => {
    const [monthlyVolume, setMonthlyVolume] = useState(100000);
    const [avgTransaction, setAvgTransaction] = useState(100);
    const [isHovering, setIsHovering] = useState<string | null>(null);

    // Constants
    const STRIPE_RATE = 0.029;
    const STRIPE_FIXED = 0.30;

    const PAYPAL_RATE = 0.0349;
    const PAYPAL_FIXED = 0.49;

    const SETTLA_RATE = 0.001; // 0.1% flat
    const SETTLA_FIXED = 0.00; // No fixed fee?

    // Calculations
    const txCount = monthlyVolume / avgTransaction;

    const stripeFee = (monthlyVolume * STRIPE_RATE) + (txCount * STRIPE_FIXED);
    const paypalFee = (monthlyVolume * PAYPAL_RATE) + (txCount * PAYPAL_FIXED);
    const settlaFee = (monthlyVolume * SETTLA_RATE) + (txCount * SETTLA_FIXED);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const formatFee = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2,
        }).format(val);
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden relative">

                {/* Input Section */}
                <div className="grid md:grid-cols-2 gap-12 mb-12">
                    {/* Sliders */}
                    <div className="space-y-10">
                        {/* Volume Slider */}
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <label className="text-zinc-400 text-sm font-medium">Monthly Processing Volume</label>
                                <div className="text-2xl font-bold text-white tabular-nums">
                                    {formatCurrency(monthlyVolume)}
                                </div>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input
                                    type="range"
                                    min="5000"
                                    max="500000"
                                    step="5000"
                                    value={monthlyVolume}
                                    onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                                    className="w-full absolute z-20 opacity-0 cursor-pointer h-full"
                                />
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative z-10">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6]"
                                        style={{ width: `${(monthlyVolume / 500000) * 100}%` }}
                                        layoutId="volumeBar"
                                    />
                                </div>
                                <motion.div
                                    className="absolute z-10 w-6 h-6 bg-white rounded-full shadow-[0_0_10px_rgba(13,148,136,0.5)] border-2 border-[#0d9488] top-0"
                                    style={{ left: `calc(${(monthlyVolume / 500000) * 100}% - 12px)` }}
                                    layoutId="volumeKnob"
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-zinc-600 font-mono">
                                <span>$5k</span>
                                <span>$500k</span>
                            </div>
                        </div>

                        {/* Avg Transaction Slider */}
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <label className="text-zinc-400 text-sm font-medium">Average Transaction Size</label>
                                <div className="text-2xl font-bold text-white tabular-nums">
                                    ${avgTransaction}
                                </div>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input
                                    type="range"
                                    min="10"
                                    max="1000"
                                    step="10"
                                    value={avgTransaction}
                                    onChange={(e) => setAvgTransaction(Number(e.target.value))}
                                    className="w-full absolute z-20 opacity-0 cursor-pointer h-full"
                                />
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative z-10">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                                        style={{ width: `${(avgTransaction / 1000) * 100}%` }}
                                    />
                                </div>
                                <div
                                    className="absolute z-10 w-6 h-6 bg-white rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)] border-2 border-emerald-500 top-0 pointer-events-none transition-all duration-75"
                                    style={{ left: `calc(${(avgTransaction / 1000) * 100}% - 12px)` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-zinc-600 font-mono">
                                <span>$10</span>
                                <span>$1,000</span>
                            </div>
                        </div>
                    </div>

                    {/* Results Summary - The "Wow" Factor */}
                    <div className="flex flex-col justify-center">
                        <div className="bg-[#0d9488]/10 border border-[#0d9488]/20 rounded-2xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0d9488]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <h3 className="text-zinc-400 font-medium mb-2 relative z-10">You could save</h3>
                            <div className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight flex items-baseline gap-2 relative z-10">
                                <span className="text-[#0d9488]">$</span>
                                <RollingNumber value={Math.round(stripeFee - settlaFee)} />
                                <span className="text-lg text-zinc-500 font-normal">/mo</span>
                            </div>
                            <p className="text-zinc-400 text-sm relative z-10">
                                That's <span className="text-white font-bold">{formatFee((stripeFee - settlaFee) * 12)}</span> extra profit per year.
                            </p>

                            <div className="mt-8 pt-6 border-t border-[#0d9488]/20 flex gap-4">
                                <div className="flex-1">
                                    <div className="text-xs text-zinc-500 mb-1">Stripe Fees</div>
                                    <div className="text-red-400 font-mono font-medium">-{formatFee(stripeFee)}</div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-zinc-500 mb-1">Settla Fees</div>
                                    <div className="text-[#0d9488] font-mono font-bold flex items-center gap-1">
                                        -{formatFee(settlaFee)}
                                        <span className="px-1.5 py-0.5 rounded-full bg-[#0d9488]/20 text-[10px] uppercase">Best</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Bar Comparison */}
                <div className="space-y-4">
                    <FeeBar
                        name="Stripe"
                        color="bg-cyan-500"
                        fee={stripeFee}
                        total={monthlyVolume}
                        icon="S"
                        rate="2.9% + 30¢"
                    />
                    <FeeBar
                        name="PayPal"
                        color="bg-blue-500"
                        fee={paypalFee}
                        total={monthlyVolume}
                        icon="P"
                        rate="3.49% + 49¢"
                    />
                    <FeeBar
                        name="Settla"
                        color="bg-[#0d9488]"
                        fee={settlaFee}
                        total={monthlyVolume}
                        isHero={true}
                        icon={<img src="/brand/settla.svg" alt="S" className="w-full h-full object-cover" />}
                        rate="0.1% flat"
                    />
                </div>

                <p className="text-center text-xs text-zinc-600 mt-8">
                    *Estimates based on standard commercial rates. Competitor fees may vary by region and plan.
                </p>
            </div>
        </div>
    );
};

const FeeBar = ({ name, color, fee, total, icon, isHero = false, rate }: any) => {
    const percentLost = (fee / total) * 100;
    const percentKept = 100 - percentLost;

    return (
        <div className={`relative group ${isHero ? 'mt-6' : ''}`}>
            <div className="flex items-center justify-between mb-2 text-sm">
                <div className="flex items-center gap-2">
                    {typeof icon === 'string' ? (
                        <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${isHero ? 'bg-[#0d9488]/20 text-[#0d9488]' : 'bg-zinc-800 text-zinc-400'}`}>
                            {icon}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded overflow-hidden">
                            {icon}
                        </div>
                    )}
                    <span className={`font-medium ${isHero ? 'text-white' : 'text-zinc-400'}`}>{name}</span>
                    {!isHero && <span className="text-zinc-600 text-xs">({rate})</span>}
                </div>
                <div className="text-right flex items-center gap-2">
                    <span className={`${isHero ? 'text-[#0d9488]' : 'text-red-400'} font-mono text-xs`}>
                        -${Math.round(fee).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className={`h-10 w-full rounded-lg overflow-hidden flex relative ${isHero ? 'bg-[#0d9488]/10 ring-1 ring-[#0d9488]/30' : 'bg-zinc-900'}`}>
                {/* Kept Amount Bar */}
                <motion.div
                    className={`h-full ${isHero ? 'bg-gradient-to-r from-[#0d9488] to-[#14b8a6]' : 'bg-zinc-800'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentKept}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />

                {/* Fee Bar (Lost) */}
                <motion.div
                    className={`h-full ${isHero ? 'bg-[#0d9488]/20' : 'bg-red-500/20'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentLost}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />

                {/* Text inside bar if enough space */}
                <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                    <span className={`text-xs font-bold ${isHero ? 'text-white' : 'text-zinc-500'}`}>
                        ${Math.round(total - fee).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

const RollingNumber = ({ value }: { value: number }) => {
    return (
        <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={value} // Re-animates on change
            className="tabular-nums"
        >
            {value.toLocaleString()}
        </motion.span>
    );
};
