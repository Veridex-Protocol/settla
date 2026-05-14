"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Wallet, Building2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
    currentStep: number;
    totalSteps: number;
}

const STEPS = [
    { icon: Wallet, label: "Connect Wallet", description: "Link your Veridex account" },
    { icon: Building2, label: "Business Details", description: "Tell us about your business" },
    { icon: Shield, label: "Verification", description: "Complete verification" },
];

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                const Icon = step.icon;

                return (
                    <React.Fragment key={stepNum}>
                        {/* Step */}
                        <div className="flex flex-col items-center">
                            <motion.div
                                className={cn(
                                    "flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300",
                                    isCompleted
                                        ? "bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-500/50 shadow-lg shadow-emerald-500/30"
                                        : isActive
                                            ? "bg-gradient-to-br from-emerald-600 to-cyan-600 border-emerald-500/50 shadow-lg shadow-emerald-500/30"
                                            : "bg-slate-800/50 border-slate-700"
                                )}
                                initial={false}
                                animate={{ scale: isActive ? 1.05 : 1 }}
                            >
                                {isCompleted ? (
                                    <Check className="h-6 w-6 text-white" />
                                ) : (
                                    <Icon className={cn(
                                        "h-6 w-6",
                                        isActive ? "text-white" : "text-slate-500"
                                    )} />
                                )}
                            </motion.div>
                            <div className="mt-3 text-center">
                                <p className={cn(
                                    "text-sm font-medium",
                                    isActive || isCompleted ? "text-white" : "text-slate-500"
                                )}>
                                    {step.label}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                                    {step.description}
                                </p>
                            </div>
                        </div>

                        {/* Connector Line */}
                        {index < totalSteps - 1 && (
                            <div className="flex-1 mx-4 hidden sm:block">
                                <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: isCompleted ? "100%" : "0%" }}
                                        transition={{ duration: 0.5, ease: "easeInOut" }}
                                    />
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
