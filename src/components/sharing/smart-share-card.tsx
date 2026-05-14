'use client';

import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas-pro'; // Using html2canvas-pro for oklab color support
import { motion } from 'framer-motion';

interface SmartShareCardProps {
    type: 'savings' | 'referral';
    data: any;
    referralLink: string;
    className?: string;
    onDownloadStart?: () => void;
    onDownloadEnd?: () => void;
}

export function SmartShareCard({
    type,
    data,
    referralLink,
    className = '',
    onDownloadStart,
    onDownloadEnd,
}: SmartShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Generate unique gradient based on data to make it feel custom/AI
    const generateGradient = () => {
        const seed = type === 'savings' ? data.totalSaved : data.code?.length || 0;
        const hue1 = (seed * 137) % 360;
        const hue2 = (seed * 53) % 360;
        return `linear-gradient(135deg, hsl(${hue1}, 70%, 20%), hsl(${hue2}, 70%, 15%))`;
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        onDownloadStart?.();

        try {
            // Configuration for high quality
            const canvas = await html2canvas(cardRef.current, {
                scale: 4, // 4x scale for high definition
                useCORS: true,
                backgroundColor: null,
                logging: false,
                allowTaint: true,
                imageTimeout: 0,
            });

            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = `sera-${type}-card-${Date.now()}.png`;
            link.click();
        } catch (error) {
            console.error('Failed to generate image:', error);
        } finally {
            setIsGenerating(false);
            onDownloadEnd?.();
        }
    };

    const CardContent = () => {
        if (type === 'savings') {
            return (
                <>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-1">Monthly Savings</h3>
                            <p className="text-zinc-300 text-sm">Powered by Settla</p>
                        </div>
                        {/* Chip / QR Code Section */}
                        <div className="bg-white p-1 rounded-lg shadow-lg">
                            <QRCodeSVG
                                value={referralLink}
                                size={64}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                <span className="text-zinc-300 text-sm">Stripe (3.5%)</span>
                            </div>
                            <span className="text-zinc-400 font-mono text-sm line-through decoration-red-400/50">
                                ${data.stripeCost?.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                <span className="text-zinc-300 text-sm">PayPal (4%)</span>
                            </div>
                            <span className="text-zinc-400 font-mono text-sm line-through decoration-red-400/50">
                                ${data.paypalCost?.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center bg-[#0d9488]/20 p-3 rounded-lg border border-[#0d9488]/30 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#0d9488]" />
                                <span className="text-white font-medium text-sm">Sera (1%)</span>
                            </div>
                            <span className="text-[#0d9488] font-mono font-bold">
                                ${data.seraCost?.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto border-t border-white/10 pt-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-zinc-400 text-xs mb-1">TOTAL SAVED</p>
                                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                                    ${data.totalSaved?.toFixed(2)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-zinc-500 font-mono">
                                    {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono">sett.la</p>
                            </div>
                        </div>
                    </div>
                </>
            );
        }

        // Referral Card
        return (
            <>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🤝</span>
                            <h3 className="text-xl font-bold text-white">Join me on Settla</h3>
                        </div>
                        <p className="text-zinc-300 text-sm max-w-[200px]">
                            Start accepting stablecoin payments with 1% fees and instant settlement.
                        </p>
                    </div>
                    <div className="bg-white p-2 rounded-xl shadow-lg transform rotate-3">
                        <QRCodeSVG
                            value={referralLink}
                            size={80}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-center mb-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <p className="text-zinc-400 text-xs mb-2 uppercase tracking-wider">Referral Code</p>
                    <p className="text-3xl font-mono font-bold text-white tracking-widest">
                        {data.code}
                    </p>
                </div>

                <div className="mt-auto flex items-center justify-between text-xs text-zinc-400 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Verified Merchant</span>
                    </div>
                    <span>sett.la</span>
                </div>
            </>
        );
    };

    return (
        <div className={className}>
            {/* Hidden container for image generation - configured for High Definition */}
            <div className="fixed left-[-9999px] top-[-9999px]">
                <div
                    ref={cardRef}
                    className="w-[600px] h-[350px] relative p-8 flex flex-col justify-between overflow-hidden"
                    style={{
                        background: generateGradient(),
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        fontFamily: 'Inter, sans-serif', // Ensure consistent font
                    }}
                >
                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />
                    {/* Noise texture effect using CSS pattern instead of missing image */}
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

                    {/* Glass Overlay */}
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] rounded-[24px]" />

                    <div className="relative z-10 h-full flex flex-col">
                        <CardContent />
                    </div>
                </div>
            </div>

            {/* Visible UI for the user */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-zinc-300 transition-colors"
            >
                {isGenerating ? (
                    <>
                        <span className="animate-spin">⏳</span>
                        Wait...
                    </>
                ) : (
                    <>
                        <span>⬇️</span>
                        {type === 'savings' ? 'Share Savings Card' : 'Download Referral Card'}
                    </>
                )}
            </motion.button>
        </div>
    );
}
