/**
 * Animation System for Sera Dashboard
 * Provides consistent, Apple-grade micro-interactions
 */

// Tailwind CSS animation classes (add to tailwind.config.js)
export const animationConfig = {
    keyframes: {
        'fade-in-up': {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-scale': {
            '0%': { opacity: '0', transform: 'scale(0.95)' },
            '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
            '0%': { opacity: '0', transform: 'translateX(-10px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
            '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' },
            '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(16, 185, 129, 0.5)' },
        },
        'count-up': {
            '0%': { opacity: '0', transform: 'translateY(5px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'checkmark': {
            '0%': { transform: 'scale(0)', opacity: '0' },
            '50%': { transform: 'scale(1.2)' },
            '100%': { transform: 'scale(1)', opacity: '1' },
        },
    },
    animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'fade-in-scale': 'fade-in-scale 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
        'count-up': 'count-up 0.5s ease-out forwards',
        'checkmark': 'checkmark 0.4s ease-out forwards',
    },
};

// Animation class utilities for JSX
export const animations = {
    // Entry animations
    fadeInUp: 'opacity-0 animate-fade-in-up',
    fadeInScale: 'opacity-0 animate-fade-in-scale',
    slideInRight: 'opacity-0 animate-slide-in-right',

    // Staggered delays for grids
    stagger: {
        1: 'animation-delay-[0ms]',
        2: 'animation-delay-[50ms]',
        3: 'animation-delay-[100ms]',
        4: 'animation-delay-[150ms]',
        5: 'animation-delay-[200ms]',
        6: 'animation-delay-[250ms]',
    },

    // Interactive states
    cardHover: 'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30',
    buttonPress: 'active:scale-[0.98] transition-transform',
    linkUnderline: 'relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all hover:after:w-full',

    // Loading states  
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
    pulse: 'animate-pulse',

    // Success/feedback
    checkmark: 'animate-checkmark',
    pulseGlow: 'animate-pulse-glow',
};

// Generate stagger delay style
export function getStaggerDelay(index: number, baseDelayMs = 50): React.CSSProperties {
    return {
        animationDelay: `${index * baseDelayMs}ms`,
        animationFillMode: 'forwards',
    };
}

// Hook for count-up animation
export function useCountUp(
    endValue: number,
    duration = 1000,
    startOnMount = true
): { value: number; start: () => void } {
    const [value, setValue] = React.useState(0);
    const [started, setStarted] = React.useState(false);

    const start = React.useCallback(() => {
        setStarted(true);
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(endValue * eased));
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [endValue, duration]);

    React.useEffect(() => {
        if (startOnMount && !started) {
            start();
        }
    }, [startOnMount, started, start]);

    return { value, start };
}

// Import React for the hook
import React from 'react';
