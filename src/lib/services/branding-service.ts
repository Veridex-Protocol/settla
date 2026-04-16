/**
 * Invoice & Receipt Branding Service
 * 
 * Manages custom branding configurations for merchants based on tier level:
 * - Bronze: Default Settla branding only
 * - Silver: Custom invoice branding (colors, logo, fonts)
 * - Gold: Custom invoice + receipt branding
 * - Diamond: Full customization + AI-generated backgrounds
 */

import { db } from "@/lib/db";
import { MerchantTier } from "@prisma/client";
import { GoogleGenAI } from "@google/genai";

// ============================================================================
// Types
// ============================================================================

export interface ColorPalette {
  primary: string;        // Main brand color
  primaryLight: string;   // Light version for backgrounds
  secondary: string;      // Accent color
  text: string;           // Primary text color
  textLight: string;      // Secondary text color
  border: string;         // Border color
  background: string;     // Background color
  success: string;        // Success state
  warning: string;        // Warning state
  error: string;          // Error state
}

export interface InvoiceBrandingConfig {
  // Basic customization (Silver+)
  colorPalette?: ColorPalette;
  logoUrl?: string;
  logoPosition?: 'left' | 'center' | 'right';
  showSeraBranding?: boolean;  // Whether to show "Powered by Settla"
  
  // Header customization
  headerStyle?: 'default' | 'minimal' | 'bold' | 'gradient';
  headerBackgroundColor?: string;
  headerTextColor?: string;
  
  // Typography
  fontFamily?: 'helvetica' | 'times' | 'courier';  // jsPDF supported fonts
  
  // Footer customization
  customFooterText?: string;
  showPaymentInstructions?: boolean;
  
  // Layout
  compactMode?: boolean;
  showQRCode?: boolean;
}

export interface ReceiptBrandingConfig extends InvoiceBrandingConfig {
  // Gold+ features
  backgroundStyle?: 'solid' | 'gradient' | 'pattern' | 'ai-generated';
  
  // Diamond features - AI backgrounds
  aiBackgroundPrompt?: string;
  aiBackgroundUrl?: string;
  aiBackgroundTheme?: 'professional' | 'creative' | 'minimal' | 'luxury';
  
  // Receipt-specific
  showTransactionQR?: boolean;
  showBlockExplorerLink?: boolean;
  certificateStyle?: boolean;  // Premium certificate-like design
}

export interface BrandingPermissions {
  canCustomizeInvoice: boolean;
  canCustomizeReceipt: boolean;
  canUseAIBackground: boolean;
  canHideSeraBranding: boolean;
  canUseCustomFonts: boolean;
  canUseCertificateStyle: boolean;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_INVOICE_COLORS: ColorPalette = {
  primary: '#6366f1',      // Indigo 500
  primaryLight: '#e0e7ff', // Indigo 100
  secondary: '#0891b2',    // Cyan 600
  text: '#0f172a',         // Slate 900
  textLight: '#64748b',    // Slate 500
  border: '#e2e8f0',       // Slate 200
  background: '#f8fafc',   // Slate 50
  success: '#10b981',      // Emerald 500
  warning: '#f59e0b',      // Amber 500
  error: '#ef4444',        // Red 500
};

export const DEFAULT_RECEIPT_COLORS: ColorPalette = {
  primary: '#059669',      // Emerald 600
  primaryLight: '#d1fae5', // Emerald 100
  secondary: '#0891b2',    // Cyan 600
  text: '#0f172a',         // Slate 900
  textLight: '#64748b',    // Slate 500
  border: '#e2e8f0',       // Slate 200
  background: '#f8fafc',   // Slate 50
  success: '#10b981',      // Emerald 500
  warning: '#f59e0b',      // Amber 500
  error: '#ef4444',        // Red 500
};

export const DEFAULT_INVOICE_BRANDING: InvoiceBrandingConfig = {
  colorPalette: DEFAULT_INVOICE_COLORS,
  logoPosition: 'left',
  showSeraBranding: true,
  headerStyle: 'default',
  fontFamily: 'helvetica',
  showPaymentInstructions: true,
  compactMode: false,
  showQRCode: true,
};

export const DEFAULT_RECEIPT_BRANDING: ReceiptBrandingConfig = {
  ...DEFAULT_INVOICE_BRANDING,
  colorPalette: DEFAULT_RECEIPT_COLORS,
  backgroundStyle: 'solid',
  showTransactionQR: true,
  showBlockExplorerLink: true,
  certificateStyle: false,
};

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * Get branding permissions based on merchant tier
 */
export function getBrandingPermissions(tier: MerchantTier): BrandingPermissions {
  switch (tier) {
    case 'DIAMOND':
      return {
        canCustomizeInvoice: true,
        canCustomizeReceipt: true,
        canUseAIBackground: true,
        canHideSeraBranding: true,
        canUseCustomFonts: true,
        canUseCertificateStyle: true,
      };
    case 'GOLD':
      return {
        canCustomizeInvoice: true,
        canCustomizeReceipt: true,
        canUseAIBackground: false,
        canHideSeraBranding: true,
        canUseCustomFonts: true,
        canUseCertificateStyle: false,
      };
    case 'SILVER':
      return {
        canCustomizeInvoice: true,
        canCustomizeReceipt: false,
        canUseAIBackground: false,
        canHideSeraBranding: false,
        canUseCustomFonts: false,
        canUseCertificateStyle: false,
      };
    case 'BRONZE':
    default:
      return {
        canCustomizeInvoice: false,
        canCustomizeReceipt: false,
        canUseAIBackground: false,
        canHideSeraBranding: false,
        canUseCustomFonts: false,
        canUseCertificateStyle: false,
      };
  }
}

/**
 * Check if a user has access to a specific branding feature
 */
export function canUseBrandingFeature(
  tier: MerchantTier,
  feature: keyof BrandingPermissions
): boolean {
  return getBrandingPermissions(tier)[feature];
}

// ============================================================================
// Branding Configuration Management
// ============================================================================

/**
 * Get invoice branding config for a business
 */
export async function getInvoiceBranding(businessId: string): Promise<InvoiceBrandingConfig> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      invoiceBranding: true,
      logoUrl: true,
      users: {
        select: { merchantTier: true },
        take: 1,
      },
    },
  });

  if (!business) {
    return DEFAULT_INVOICE_BRANDING;
  }

  const tier = business.users[0]?.merchantTier || 'BRONZE';
  const permissions = getBrandingPermissions(tier);

  // Bronze tier gets default branding only
  if (!permissions.canCustomizeInvoice) {
    return {
      ...DEFAULT_INVOICE_BRANDING,
      logoUrl: business.logoUrl || undefined,
    };
  }

  // Merge custom branding with defaults
  const customBranding = (business.invoiceBranding as InvoiceBrandingConfig) || {};
  
  return {
    ...DEFAULT_INVOICE_BRANDING,
    ...customBranding,
    logoUrl: customBranding.logoUrl || business.logoUrl || undefined,
    // Enforce tier restrictions
    showSeraBranding: permissions.canHideSeraBranding 
      ? (customBranding.showSeraBranding ?? true) 
      : true,
  };
}

/**
 * Get receipt branding config for a business
 */
export async function getReceiptBranding(businessId: string): Promise<ReceiptBrandingConfig> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      receiptBranding: true,
      invoiceBranding: true,
      logoUrl: true,
      users: {
        select: { merchantTier: true },
        take: 1,
      },
    },
  });

  if (!business) {
    return DEFAULT_RECEIPT_BRANDING;
  }

  const tier = business.users[0]?.merchantTier || 'BRONZE';
  const permissions = getBrandingPermissions(tier);

  // Bronze and Silver tiers get default branding only
  if (!permissions.canCustomizeReceipt) {
    return {
      ...DEFAULT_RECEIPT_BRANDING,
      logoUrl: business.logoUrl || undefined,
    };
  }

  // Merge custom branding with defaults
  const customBranding = (business.receiptBranding as ReceiptBrandingConfig) || {};
  const invoiceBranding = (business.invoiceBranding as InvoiceBrandingConfig) || {};
  
  // Inherit from invoice branding where not specified
  const mergedBranding: ReceiptBrandingConfig = {
    ...DEFAULT_RECEIPT_BRANDING,
    ...invoiceBranding,
    ...customBranding,
    logoUrl: customBranding.logoUrl || invoiceBranding.logoUrl || business.logoUrl || undefined,
    // Enforce tier restrictions
    showSeraBranding: permissions.canHideSeraBranding 
      ? (customBranding.showSeraBranding ?? true) 
      : true,
    backgroundStyle: permissions.canUseAIBackground 
      ? (customBranding.backgroundStyle || 'solid')
      : (customBranding.backgroundStyle === 'ai-generated' ? 'solid' : customBranding.backgroundStyle),
    certificateStyle: permissions.canUseCertificateStyle 
      ? (customBranding.certificateStyle ?? false) 
      : false,
  };

  return mergedBranding;
}

/**
 * Update invoice branding for a business
 */
export async function updateInvoiceBranding(
  businessId: string,
  userId: string,
  branding: Partial<InvoiceBrandingConfig>
): Promise<{ success: boolean; error?: string; branding?: InvoiceBrandingConfig }> {
  // Get user's tier
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { merchantTier: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const permissions = getBrandingPermissions(user.merchantTier);

  if (!permissions.canCustomizeInvoice) {
    return { 
      success: false, 
      error: 'Invoice customization requires Silver tier or higher. Upgrade to unlock this feature!' 
    };
  }

  // Sanitize branding based on permissions
  const sanitizedBranding: Partial<InvoiceBrandingConfig> = {
    ...branding,
    showSeraBranding: permissions.canHideSeraBranding 
      ? branding.showSeraBranding 
      : true,
  };

  // Update the business
  const updated = await db.business.update({
    where: { id: businessId },
    data: {
      invoiceBranding: sanitizedBranding as object,
    },
    select: { invoiceBranding: true },
  });

  return {
    success: true,
    branding: updated.invoiceBranding as InvoiceBrandingConfig,
  };
}

/**
 * Update receipt branding for a business
 */
export async function updateReceiptBranding(
  businessId: string,
  userId: string,
  branding: Partial<ReceiptBrandingConfig>
): Promise<{ success: boolean; error?: string; branding?: ReceiptBrandingConfig }> {
  // Get user's tier
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { merchantTier: true },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const permissions = getBrandingPermissions(user.merchantTier);

  if (!permissions.canCustomizeReceipt) {
    return { 
      success: false, 
      error: 'Receipt customization requires Gold tier or higher. Upgrade to unlock this feature!' 
    };
  }

  // Sanitize branding based on permissions
  const sanitizedBranding: Partial<ReceiptBrandingConfig> = {
    ...branding,
    showSeraBranding: permissions.canHideSeraBranding 
      ? branding.showSeraBranding 
      : true,
    backgroundStyle: permissions.canUseAIBackground 
      ? branding.backgroundStyle 
      : (branding.backgroundStyle === 'ai-generated' ? 'solid' : branding.backgroundStyle),
    certificateStyle: permissions.canUseCertificateStyle 
      ? branding.certificateStyle 
      : false,
  };

  // Update the business
  const updated = await db.business.update({
    where: { id: businessId },
    data: {
      receiptBranding: sanitizedBranding as object,
    },
    select: { receiptBranding: true },
  });

  return {
    success: true,
    branding: updated.receiptBranding as ReceiptBrandingConfig,
  };
}

// ============================================================================
// AI Background Generation (Diamond tier)
// ============================================================================

/**
 * Generate an AI background for receipts (Diamond tier only)
 */
export async function generateAIReceiptBackground(
  businessId: string,
  userId: string,
  options: {
    theme?: 'professional' | 'creative' | 'minimal' | 'luxury';
    customPrompt?: string;
  } = {}
): Promise<{ success: boolean; error?: string; backgroundUrl?: string }> {
  // Check permissions
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { business: true },
  });

  if (!user || !user.business) {
    return { success: false, error: 'User or business not found' };
  }

  const permissions = getBrandingPermissions(user.merchantTier);

  if (!permissions.canUseAIBackground) {
    return { 
      success: false, 
      error: 'AI backgrounds require Diamond tier. Upgrade to unlock this premium feature!' 
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'AI service not configured' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const businessName = user.business.name;
    const theme = options.theme || 'professional';

    // Build the prompt
    const themeDescriptions: Record<string, string> = {
      professional: 'Clean, corporate, subtle gradients, muted colors, geometric patterns',
      creative: 'Vibrant, artistic, abstract shapes, bold colors, modern design',
      minimal: 'Minimalist, lots of white space, simple lines, monochromatic',
      luxury: 'Elegant, gold accents, premium feel, sophisticated patterns, dark tones',
    };

    const prompt = options.customPrompt || 
      `Create a beautiful, subtle background design for a payment receipt. 
      Theme: ${themeDescriptions[theme]}
      Business: ${businessName}
      
      Requirements:
      - Subtle and professional, not distracting from text content
      - No text or logos in the image
      - Soft, muted colors suitable for a document background
      - Abstract or geometric patterns preferred
      - Should work well with dark text overlaid on top
      - Resolution suitable for A4 document (1240 x 1754 pixels)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        responseModalities: ['image', 'text'],
      },
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        const backgroundUrl = `data:${mimeType};base64,${imageData}`;

        // Store the generated background
        await db.business.update({
          where: { id: businessId },
          data: {
            receiptBranding: {
              ...(user.business.receiptBranding as object || {}),
              aiBackgroundUrl: backgroundUrl,
              aiBackgroundTheme: theme,
              aiBackgroundPrompt: options.customPrompt,
              backgroundStyle: 'ai-generated',
            },
          },
        });

        return { success: true, backgroundUrl };
      }
    }

    return { success: false, error: 'AI did not generate an image' };
  } catch (error) {
    console.error('Failed to generate AI background:', error);
    return { success: false, error: 'Failed to generate AI background' };
  }
}

// ============================================================================
// Preset Color Palettes
// ============================================================================

export const COLOR_PRESETS: Record<string, ColorPalette> = {
  sera: DEFAULT_INVOICE_COLORS,
  ocean: {
    primary: '#0ea5e9',      // Sky 500
    primaryLight: '#e0f2fe', // Sky 100
    secondary: '#14b8a6',    // Teal 500
    text: '#0f172a',
    textLight: '#64748b',
    border: '#e2e8f0',
    background: '#f0f9ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  forest: {
    primary: '#22c55e',      // Green 500
    primaryLight: '#dcfce7', // Green 100
    secondary: '#84cc16',    // Lime 500
    text: '#14532d',
    textLight: '#4ade80',
    border: '#bbf7d0',
    background: '#f0fdf4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  sunset: {
    primary: '#f97316',      // Orange 500
    primaryLight: '#ffedd5', // Orange 100
    secondary: '#f43f5e',    // Rose 500
    text: '#431407',
    textLight: '#fb923c',
    border: '#fed7aa',
    background: '#fff7ed',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  midnight: {
    primary: '#8b5cf6',      // Violet 500
    primaryLight: '#ede9fe', // Violet 100
    secondary: '#a855f7',    // Purple 500
    text: '#1e1b4b',
    textLight: '#a78bfa',
    border: '#ddd6fe',
    background: '#faf5ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  rose: {
    primary: '#ec4899',      // Pink 500
    primaryLight: '#fce7f3', // Pink 100
    secondary: '#f43f5e',    // Rose 500
    text: '#500724',
    textLight: '#f472b6',
    border: '#fbcfe8',
    background: '#fdf2f8',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  corporate: {
    primary: '#1e40af',      // Blue 800
    primaryLight: '#dbeafe', // Blue 100
    secondary: '#0284c7',    // Sky 600
    text: '#1e3a8a',
    textLight: '#60a5fa',
    border: '#bfdbfe',
    background: '#eff6ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
};

/**
 * Get available color presets for UI
 */
export function getColorPresets(): { id: string; name: string; colors: ColorPalette }[] {
  return [
    { id: 'sera', name: 'Sera Default', colors: COLOR_PRESETS.sera },
    { id: 'ocean', name: 'Ocean Blue', colors: COLOR_PRESETS.ocean },
    { id: 'forest', name: 'Forest Green', colors: COLOR_PRESETS.forest },
    { id: 'sunset', name: 'Sunset Orange', colors: COLOR_PRESETS.sunset },
    { id: 'midnight', name: 'Midnight Purple', colors: COLOR_PRESETS.midnight },
    { id: 'rose', name: 'Rose Pink', colors: COLOR_PRESETS.rose },
    { id: 'corporate', name: 'Corporate Blue', colors: COLOR_PRESETS.corporate },
  ];
}
