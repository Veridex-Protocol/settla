"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { ArrowDown, ArrowUp, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    currency?: string;
    className?: string;
}

export function StatsCard({
    title,
    value,
    change,
    changeLabel = "vs last month",
    icon,
    trend = "neutral",
    currency,
    className,
}: StatsCardProps) {
    const formattedValue = currency
        ? formatCurrency(value as number, currency)
        : value;

    return (
        <Card variant="glass" className={cn("overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400 text-zinc-400">
                    {title}
                </CardTitle>
                {icon && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 text-emerald-400 from-emerald-900/30 to-cyan-900/30 text-emerald-400">
                        {icon}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-white text-white">
                    {formattedValue}
                </div>
                {change !== undefined && (
                    <div className="mt-2 flex items-center gap-1.5">
                        {trend === "up" && (
                            <div className="flex items-center gap-1 text-emerald-400 text-emerald-400">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/30 bg-emerald-900/30">
                                    <ArrowUp className="h-3 w-3" />
                                </div>
                                <span className="text-sm font-medium">+{change}%</span>
                            </div>
                        )}
                        {trend === "down" && (
                            <div className="flex items-center gap-1 text-red-400 text-red-400">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-900/30 bg-red-900/30">
                                    <ArrowDown className="h-3 w-3" />
                                </div>
                                <span className="text-sm font-medium">{change}%</span>
                            </div>
                        )}
                        {trend === "neutral" && (
                            <div className="flex items-center gap-1 text-zinc-400">
                                <Minus className="h-3 w-3" />
                                <span className="text-sm font-medium">{change}%</span>
                            </div>
                        )}
                        <span className="text-sm text-zinc-400">{changeLabel}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
