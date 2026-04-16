"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Building2,
    Mail,
    Globe,
    Briefcase,
    Info,
    ChevronRight
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
import { OnboardingData, INDUSTRIES } from "./types";
import { cn } from "@/lib/utils";

interface BusinessDetailsStepProps {
    data: OnboardingData;
    updateData: (fields: Partial<OnboardingData>) => void;
    onNext: () => void;
}

interface FormFieldProps {
    label: string;
    tooltip: string;
    icon: React.ElementType;
    children: React.ReactNode;
    required?: boolean;
}

function FormField({ label, tooltip, icon: Icon, children, required }: FormFieldProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400" />
                <Label className="text-sm font-medium text-white">
                    {label}
                    {required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent
                            side="right"
                            className="max-w-xs bg-slate-800 border-slate-700 text-slate-200"
                        >
                            <p className="text-sm">{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            {children}
        </div>
    );
}

export function BusinessDetailsStep({ data, updateData, onNext }: BusinessDetailsStepProps) {
    const isValid = data.name.trim() && data.email.trim() && data.email.includes('@');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Tell Us About Your Business
                </h2>
                <p className="text-slate-400">
                    This information helps us personalize your dashboard and provide better support.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <FormField
                        label="Business Name"
                        tooltip="Your legal business name or DBA. This will appear on invoices and receipts."
                        icon={Building2}
                        required
                    >
                        <Input
                            value={data.name}
                            onChange={(e) => updateData({ name: e.target.value })}
                            placeholder="Acme Corporation"
                            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                    </FormField>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <FormField
                        label="Business Email"
                        tooltip="Primary contact email for payment notifications and customer communications."
                        icon={Mail}
                        required
                    >
                        <Input
                            type="email"
                            value={data.email}
                            onChange={(e) => updateData({ email: e.target.value })}
                            placeholder="payments@acme.com"
                            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                    </FormField>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <FormField
                        label="Industry"
                        tooltip="Select your primary business category to help us optimize your experience."
                        icon={Briefcase}
                    >
                        <Select
                            value={data.industry}
                            onValueChange={(value) => updateData({ industry: value })}
                        >
                            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white focus:border-violet-500 focus:ring-violet-500/20">
                                <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                {INDUSTRIES.map((industry) => (
                                    <SelectItem
                                        key={industry.value}
                                        value={industry.value}
                                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                    >
                                        {industry.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <FormField
                        label="Website"
                        tooltip="Your business website URL. Helps with verification and branding."
                        icon={Globe}
                    >
                        <Input
                            type="url"
                            value={data.website}
                            onChange={(e) => updateData({ website: e.target.value })}
                            placeholder="https://acme.com"
                            className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                    </FormField>
                </motion.div>
            </div>

            {/* Helpful Tips */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20"
            >
                <h4 className="text-sm font-medium text-violet-400 mb-2">
                    💡 Quick Tips
                </h4>
                <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Use your official business email for important notifications</li>
                    <li>• You can update these details anytime in Settings</li>
                    <li>• Adding a website helps build trust with your customers</li>
                </ul>
            </motion.div>
        </div>
    );
}
