"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    PartyPopper,
    ArrowRight,
    FileText,
    Link2,
    CreditCard,
    Sparkles
} from "lucide-react";

const NEXT_STEPS = [
    {
        icon: FileText,
        title: "Create Your First Invoice",
        description: "Send professional invoices in USDC, EURC, or XSGD",
    },
    {
        icon: Link2,
        title: "Generate Payment Links",
        description: "Share links to collect payments instantly",
    },
    {
        icon: CreditCard,
        title: "Set Up Auto-Settlement",
        description: "Convert crypto to fiat automatically with Sera",
    },
];

export function CompletionStep() {
    return (
        <div className="flex flex-col items-center justify-center py-8">
            {/* Celebration Animation */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                }}
                className="relative mb-8"
            >
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-600 to-cyan-600 shadow-2xl shadow-emerald-500/40">
                    <PartyPopper className="h-14 w-14 text-white" />
                </div>

                {/* Sparkles */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -top-2 -right-2"
                >
                    <Sparkles className="h-8 w-8 text-yellow-400" />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="absolute -bottom-1 -left-3"
                >
                    <Sparkles className="h-6 w-6 text-emerald-400" />
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center mb-8"
            >
                <h2 className="text-3xl font-bold text-white mb-3">
                    Welcome to Settla!
                </h2>
                <p className="text-slate-400 max-w-md">
                    Your merchant account is ready. Start accepting crypto payments
                    and settling to your preferred currency.
                </p>
            </motion.div>

            {/* Next Steps */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-lg space-y-3"
            >
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide text-center mb-4">
                    What&apos;s Next
                </h3>

                {NEXT_STEPS.map((step, index) => (
                    <motion.div
                        key={step.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                            <step.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-medium text-white group-hover:text-emerald-300 transition-colors">
                                {step.title}
                            </h4>
                            <p className="text-sm text-slate-400">{step.description}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </motion.div>
                ))}
            </motion.div>

            {/* Redirect Notice */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-8 text-sm text-slate-500"
            >
                Redirecting to your dashboard in a moment...
            </motion.p>
        </div>
    );
}
