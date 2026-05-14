/**
 * Unified theme constants for Settla.
 *
 * Primary palette: Emerald (green) + Cyan (blue)
 * Matches dashboard canonical theme across all pages.
 */

export const THEME = {
  // Primary colors (emerald)
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Primary brand color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#134e4a',
  },

  // Secondary colors (cyan)
  secondary: {
    50: '#ecf0ff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee', // Secondary highlight
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },

  // Neutral/grayscale
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
    button: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    card: 'linear-gradient(135deg, #f0fdf4 0%, #ecf0ff 100%)',
  },
};

/**
 * Tailwind color utility classes matching the theme.
 * Use these instead of hardcoded color values.
 */
export const TAILWIND_COLORS = {
  primary: 'emerald',
  secondary: 'cyan',
  success: 'emerald',
  error: 'red',
  warning: 'amber',
  info: 'cyan',
};

/**
 * Get a tailwind class string for a component with the theme.
 * Examples:
 *   getButtonClass() → 'bg-emerald-500 hover:bg-emerald-600 text-white'
 *   getCardClass() → 'bg-white border-2 border-emerald-200'
 */
export function getButtonClass(variant: 'primary' | 'secondary' | 'outline' = 'primary'): string {
  switch (variant) {
    case 'primary':
      return 'bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors';
    case 'secondary':
      return 'bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors';
    case 'outline':
      return 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-medium rounded-lg transition-colors';
    default:
      return 'bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors';
  }
}

export function getCardClass(elevated: boolean = false): string {
  if (elevated) {
    return 'bg-white border-2 border-emerald-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow';
  }
  return 'bg-white border-2 border-emerald-100 rounded-xl shadow-md';
}

export function getBadgeClass(variant: 'success' | 'warning' | 'error' | 'info' = 'info'): string {
  const baseClass = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
  switch (variant) {
    case 'success':
      return `${baseClass} bg-emerald-100 text-emerald-800`;
    case 'warning':
      return `${baseClass} bg-amber-100 text-amber-800`;
    case 'error':
      return `${baseClass} bg-red-100 text-red-800`;
    case 'info':
      return `${baseClass} bg-cyan-100 text-cyan-800`;
    default:
      return `${baseClass} bg-cyan-100 text-cyan-800`;
  }
}

export function getGradientClass(type: 'button' | 'card' | 'text' = 'button'): string {
  switch (type) {
    case 'button':
      return 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white';
    case 'card':
      return 'bg-gradient-to-br from-emerald-50 to-cyan-50';
    case 'text':
      return 'bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent';
    default:
      return 'bg-gradient-to-r from-emerald-500 to-cyan-500';
  }
}
