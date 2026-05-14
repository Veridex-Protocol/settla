"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Shield,
    Building,
    User,
    MapPin,
    FileText,
    Info,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { OnboardingData, COUNTRIES } from "./types";
import { cn } from "@/lib/utils";

interface VerificationStepProps {
    data: OnboardingData;
    updateData: (fields: Partial<OnboardingData>) => void;
    onComplete: () => void;
    isSubmitting: boolean;
}

export function VerificationStep({
    data,
    updateData,
    onComplete,
    isSubmitting
}: VerificationStepProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Verify Your Business
                </h2>
                <p className="text-slate-400">
                    Complete verification to unlock all features and higher transaction limits.
                </p>
            </div>

            {/* Business Type Selection */}
            <div className="space-y-3">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-400" />
                    Business Type
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent
                                side="right"
                                className="max-w-xs bg-slate-800 border-slate-700 text-slate-200"
                            >
                                <p className="text-sm">
                                    Select &quot;Individual&quot; for sole proprietors or freelancers.
                                    Select &quot;Company&quot; for registered businesses.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </Label>
                <div className="grid grid-cols-2 gap-4">
                    <motion.button
                        type="button"
                        onClick={() => updateData({ businessType: 'individual' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                            data.businessType === 'individual'
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <User className={cn(
                            "h-8 w-8 mb-2",
                            data.businessType === 'individual' ? "text-emerald-400" : "text-slate-500"
                        )} />
                        <h4 className={cn(
                            "font-medium",
                            data.businessType === 'individual' ? "text-white" : "text-slate-300"
                        )}>
                            Individual
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                            Freelancer or sole proprietor
                        </p>
                    </motion.button>

                    <motion.button
                        type="button"
                        onClick={() => updateData({ businessType: 'company' })}
                        className={cn(
                            "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                            data.businessType === 'company'
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Building className={cn(
                            "h-8 w-8 mb-2",
                            data.businessType === 'company' ? "text-emerald-400" : "text-slate-500"
                        )} />
                        <h4 className={cn(
                            "font-medium",
                            data.businessType === 'company' ? "text-white" : "text-slate-300"
                        )}>
                            Company
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                            Registered business entity
                        </p>
                    </motion.button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-white flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        Country of Operation
                    </Label>
                    <Select
                        value={data.country}
                        onValueChange={(value) => updateData({ country: value })}
                    >
                        <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white focus:border-emerald-500 focus:ring-emerald-500/20">
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                            {COUNTRIES.map((country) => (
                                <SelectItem
                                    key={country.value}
                                    value={country.value}
                                    className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                >
                                    {country.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium text-white flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        Tax ID / Registration Number
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    className="max-w-xs bg-slate-800 border-slate-700 text-slate-200"
                                >
                                    <p className="text-sm">
                                        Enter your business registration number (EIN for US,
                                        Company Number for UK, etc.). This is optional for individuals.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </Label>
                    <Input
                        value={data.taxId}
                        onChange={(e) => updateData({ taxId: e.target.value })}
                        placeholder={data.businessType === 'individual' ? "Optional" : "e.g., 12-3456789"}
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                </div>
            </div>

            {/* Verification Notice */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="text-sm font-medium text-emerald-400 mb-1">
                            Instant Verification Available
                        </h4>
                        <p className="text-sm text-slate-400">
                            Most businesses are verified instantly. If additional documents are needed,
                            we&apos;ll notify you via email. You can start accepting payments immediately!
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Complete Button */}
            <div className="flex justify-end pt-4">
                <Button
                    onClick={onComplete}
                    disabled={isSubmitting || !data.country}
                    className={cn(
                        "h-12 px-8 text-base font-semibold rounded-xl transition-all duration-300",
                        "bg-gradient-to-r from-emerald-500 to-teal-500",
                        "hover:from-emerald-400 hover:to-teal-400",
                        "shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Account...
                        </>
                    ) : (
                        <>
                            <Shield className="mr-2 h-5 w-5" />
                            Complete Setup
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
