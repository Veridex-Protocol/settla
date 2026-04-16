"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
    onComplete?: () => void;
}

/**
 * AnimatedCounter - A sleek count-up animation component
 * Inspired by Apple's number animations
 */
export function AnimatedCounter({
    value,
    duration = 1500,
    prefix = "",
    suffix = "",
    decimals = 0,
    className,
    onComplete,
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const animationRef = useRef<number | null>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (hasAnimated.current && value === displayValue) return;

        const startValue = hasAnimated.current ? displayValue : 0;
        hasAnimated.current = true;

        const animate = (currentTime: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = currentTime;
            }

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);

            const current = startValue + (value - startValue) * eased;
            setDisplayValue(current);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
                onComplete?.();
            }
        };

        startTimeRef.current = null;
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration, onComplete]);

    const formattedValue = displayValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

    return (
        <span className={cn("tabular-nums", className)}>
            {prefix}
            {formattedValue}
            {suffix}
        </span>
    );
}

/**
 * AnimatedCurrency - Specialized counter for currency values
 */
export function AnimatedCurrency({
    value,
    currency = "USD",
    className,
    duration = 1500,
}: {
    value: number;
    currency?: string;
    className?: string;
    duration?: number;
}) {
    const currencySymbols: Record<string, string> = {
        USD: "$",
        USDC: "$",
        USDT: "$",
        EUR: "€",
        EURC: "€",
        GBP: "£",
        GBPA: "£",
        SGD: "S$",
        XSGD: "S$",
    };

    const symbol = currencySymbols[currency] || "$";

    return (
        <AnimatedCounter
            value={value}
            duration={duration}
            prefix={symbol}
            decimals={2}
            className={className}
        />
    );
}

/**
 * AnimatedPercentage - Counter with percentage formatting
 */
export function AnimatedPercentage({
    value,
    showSign = true,
    className,
    duration = 1000,
}: {
    value: number;
    showSign?: boolean;
    className?: string;
    duration?: number;
}) {
    const isPositive = value >= 0;
    const prefix = showSign ? (isPositive ? "+" : "") : "";

    return (
        <AnimatedCounter
            value={value}
            duration={duration}
            prefix={prefix}
            suffix="%"
            decimals={1}
            className={cn(
                isPositive ? "text-emerald-400" : "text-red-400",
                className
            )}
        />
    );
}
