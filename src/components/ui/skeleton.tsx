"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
    variant?: "default" | "text" | "circular" | "rounded";
    width?: string | number;
    height?: string | number;
    animate?: boolean;
    style?: React.CSSProperties;
}

/**
 * Skeleton - Premium shimmer loading placeholder
 */
export function Skeleton({
    className,
    variant = "default",
    width,
    height,
    animate = true,
    style,
}: SkeletonProps) {
    const variantStyles = {
        default: "rounded-md",
        text: "rounded h-4 w-full",
        circular: "rounded-full",
        rounded: "rounded-xl",
    };

    return (
        <div
            className={cn(
                "bg-zinc-800/50",
                animate && "relative overflow-hidden",
                variantStyles[variant],
                className
            )}
            style={{ width, height, ...style }}
        >
            {animate && (
                <div
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-zinc-700/30 to-transparent animate-[shimmer_2s_infinite]"
                    style={{
                        animation: "shimmer 2s infinite",
                    }}
                />
            )}
        </div>
    );
}

/**
 * SkeletonCard - Card-shaped loading placeholder
 */
export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6",
                className
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <Skeleton variant="circular" className="h-10 w-10" />
                <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton variant="text" className="h-8 w-24 mb-2" />
            <Skeleton variant="text" className="h-4 w-20" />
        </div>
    );
}

/**
 * SkeletonStats - Stats card loading placeholder
 */
export function SkeletonStats({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6",
                className
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <Skeleton variant="text" className="h-4 w-24" />
                <Skeleton variant="circular" className="h-8 w-8" />
            </div>
            <Skeleton variant="text" className="h-10 w-32 mb-2" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton variant="text" className="h-4 w-24" />
            </div>
        </div>
    );
}

/**
 * SkeletonTable - Table loading placeholder
 */
export function SkeletonTable({
    rows = 5,
    columns = 4,
    className,
}: {
    rows?: number;
    columns?: number;
    className?: string;
}) {
    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex gap-4 px-4 py-3 border-b border-zinc-800">
                {Array(columns)
                    .fill(0)
                    .map((_, i) => (
                        <Skeleton
                            key={`header-${i}`}
                            variant="text"
                            className="h-4"
                            style={{ width: `${100 / columns}%` }}
                        />
                    ))}
            </div>
            {/* Rows */}
            {Array(rows)
                .fill(0)
                .map((_, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className="flex gap-4 px-4 py-4 border-b border-zinc-800/50"
                    >
                        {Array(columns)
                            .fill(0)
                            .map((_, colIndex) => (
                                <Skeleton
                                    key={`cell-${rowIndex}-${colIndex}`}
                                    variant="text"
                                    className="h-5"
                                    style={{
                                        width: colIndex === 0 ? "30%" : `${70 / (columns - 1)}%`,
                                        animationDelay: `${rowIndex * 100}ms`,
                                    }}
                                />
                            ))}
                    </div>
                ))}
        </div>
    );
}

/**
 * SkeletonList - List item loading placeholder
 */
export function SkeletonList({
    items = 3,
    className,
}: {
    items?: number;
    className?: string;
}) {
    return (
        <div className={cn("space-y-3", className)}>
            {Array(items)
                .fill(0)
                .map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton variant="text" className="h-4 w-3/4" />
                            <Skeleton variant="text" className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                    </div>
                ))}
        </div>
    );
}

/**
 * SkeletonChart - Chart loading placeholder
 */
export function SkeletonChart({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6",
                className
            )}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-2">
                    <Skeleton variant="text" className="h-5 w-32" />
                    <Skeleton variant="text" className="h-4 w-24" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                </div>
            </div>
            {/* Chart bars */}
            <div className="flex items-end justify-between gap-2 h-48 px-4">
                {Array(12)
                    .fill(0)
                    .map((_, i) => (
                        <Skeleton
                            key={i}
                            className="w-full"
                            style={{
                                height: `${20 + Math.random() * 80}%`,
                                animationDelay: `${i * 50}ms`,
                            }}
                        />
                    ))}
            </div>
            {/* X-axis labels */}
            <div className="flex justify-between mt-4 px-4">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((_, i) => (
                    <Skeleton key={i} variant="text" className="h-3 w-8" />
                ))}
            </div>
        </div>
    );
}

// Add shimmer keyframe to globals.css
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
