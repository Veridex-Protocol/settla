import React from 'react';

interface SettlaLogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'full' | 'icon';
    theme?: 'light' | 'dark';
}

export const SettlaLogo: React.FC<SettlaLogoProps> = ({
    className = '',
    size = 'md',
    variant = 'full',
    theme = 'dark',
}) => {
    const sizes = {
        sm: { icon: 24, height: 20, fontSize: 14 },
        md: { icon: 32, height: 28, fontSize: 18 },
        lg: { icon: 40, height: 36, fontSize: 22 },
        xl: { icon: 48, height: 44, fontSize: 28 },
    };

    const { icon: iconSize, height, fontSize } = sizes[size];

    // Brand colors from guidelines
    const primaryNavy = '#1a365d';
    const tealAccent = '#0d9488';
    const white = '#ffffff';

    const textColor = theme === 'dark' ? white : primaryNavy;

    // Icon only
    if (variant === 'icon') {
        return (
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
            >
                {/* Stylized S with flowing lines and checkmark */}
                <path
                    d="M24 4C13 4 8 10 8 16C8 22 13 25 20 27C27 29 32 31 32 36C32 41 27 44 20 44"
                    stroke={tealAccent}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                />
                <path
                    d="M24 4C35 4 40 10 40 16C40 22 35 25 28 27"
                    stroke={primaryNavy}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                />
                {/* Checkmark accent */}
                <path
                    d="M36 38L40 42L48 34"
                    stroke={tealAccent}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>
        );
    }

    // Full logo with wordmark
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Icon */}
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Shield shape with flowing S and lock */}
                <path
                    d="M24 4L8 10V22C8 34 24 44 24 44C24 44 40 34 40 22V10L24 4Z"
                    fill={primaryNavy}
                    opacity="0.1"
                />
                {/* Flowing S curve */}
                <path
                    d="M16 16C16 12 20 10 24 10C28 10 32 12 32 16C32 20 28 22 24 24C20 26 16 28 16 32C16 36 20 38 24 38C28 38 32 36 32 32"
                    stroke={tealAccent}
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                />
                {/* Lock keyhole */}
                <circle cx="24" cy="18" r="2" fill={primaryNavy} />
                <path
                    d="M24 20V24"
                    stroke={primaryNavy}
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>

            {/* Wordmark */}
            <span
                style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: 600,
                    color: textColor,
                    letterSpacing: '-0.02em',
                }}
            >
                Settla
            </span>
        </div>
    );
};

// Simple text-based logo for quick use
export const SettlaWordmark: React.FC<{
    className?: string;
    showCheckmark?: boolean;
}> = ({ className = '', showCheckmark = true }) => {
    return (
        <span className={`font-semibold ${className}`}>
            Settl
            <span className="relative">
                a
                {showCheckmark && (
                    <svg
                        className="absolute -top-0.5 -right-1 w-2 h-2 text-teal-500"
                        viewBox="0 0 12 12"
                        fill="none"
                    >
                        <path
                            d="M2 6L5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </span>
        </span>
    );
};

// Animated logo for hero sections
export const SettlaLogoAnimated: React.FC<{ className?: string }> = ({
    className = '',
}) => {
    return (
        <div className={`flex items-center gap-3 group ${className}`}>
            {/* Animated icon */}
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-settla-navy to-settla-navy/80 flex items-center justify-center overflow-hidden">
                {/* S letter */}
                <span className="text-white font-bold text-lg relative z-10">S</span>
                {/* Teal accent glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-settla-teal/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Checkmark that appears on hover */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-settla-teal rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path
                            d="M2 6L5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>
            {/* Wordmark */}
            <span className="text-xl font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Settla
            </span>
        </div>
    );
};

export default SettlaLogo;
