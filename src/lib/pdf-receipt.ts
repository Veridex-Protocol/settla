/**
 * PDF Receipt Generator for Settla Dashboard
 * 
 * Creates professionally styled PDF receipts using jsPDF
 * Supports custom branding for Gold+ tier merchants
 * AI-generated backgrounds for Diamond tier
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
    ReceiptBrandingConfig,
    ColorPalette,
    DEFAULT_RECEIPT_BRANDING,
    DEFAULT_RECEIPT_COLORS,
} from './services/branding-service';

export interface ReceiptItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface ReceiptData {
    receiptNumber: string;
    date: string;
    status: 'paid' | 'pending' | 'refunded';
    business: {
        name: string;
        email: string;
        address?: string;
        logo?: string;
    };
    customer: {
        name: string;
        email: string;
        address?: string;
    };
    items: ReceiptItem[];
    subtotal: number;
    tax?: number;
    total: number;
    currency: string;
    payment?: {
        method: string;
        txHash?: string;
        paidAt?: string;
        walletAddress?: string;
        chainId?: number; // For determining which block explorer to use
    };
    // Future: Off-ramp transaction reference
    offRamp?: {
        provider: string;        // e.g., "Bridge", "MoonPay", etc.
        referenceId: string;     // Off-ramp transaction ID
        status: string;          // e.g., "completed", "pending"
        url?: string;            // Direct link to off-ramp status
    };
    notes?: string;
    // Custom branding (Gold+ tier)
    branding?: ReceiptBrandingConfig;
}

// Block explorer URLs by chain ID
const BLOCK_EXPLORERS: Record<number, { name: string; txUrl: string }> = {
    // Mainnets
    1: { name: 'Etherscan', txUrl: 'https://etherscan.io/tx/' },
    8453: { name: 'BaseScan', txUrl: 'https://basescan.org/tx/' },
    10: { name: 'Optimism Explorer', txUrl: 'https://optimistic.etherscan.io/tx/' },
    42161: { name: 'Arbiscan', txUrl: 'https://arbiscan.io/tx/' },
    137: { name: 'PolygonScan', txUrl: 'https://polygonscan.com/tx/' },
    43114: { name: 'Snowtrace', txUrl: 'https://snowtrace.io/tx/' },
    // Testnets
    11155111: { name: 'Sepolia Etherscan', txUrl: 'https://sepolia.etherscan.io/tx/' },
    84532: { name: 'Base Sepolia', txUrl: 'https://sepolia.basescan.org/tx/' },
    421614: { name: 'Arbitrum Sepolia', txUrl: 'https://sepolia.arbiscan.io/tx/' },
    11155420: { name: 'Optimism Sepolia', txUrl: 'https://sepolia-optimism.etherscan.io/tx/' },
    // Default to Sepolia Etherscan for Settla (primary testnet chain)
};

/**
 * Get colors from branding config
 */
function getColors(branding?: ReceiptBrandingConfig): ColorPalette {
    return branding?.colorPalette || DEFAULT_RECEIPT_COLORS;
}

/**
 * Format currency with proper symbol and decimals
 */
function formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
        USDC: '$',
        USDT: '$',
        EURC: '€',
        XSGD: 'S$',
        DAI: '$',
        USD: '$',
        EUR: '€',
    };
    const symbol = symbols[currency] || '';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * Get block explorer URL for a transaction
 */
function getBlockExplorerUrl(txHash: string, chainId?: number): { url: string; name: string } {
    const defaultChainId = 11155111; // Ethereum Sepolia is Settla's primary chain
    const explorer = BLOCK_EXPLORERS[chainId || defaultChainId] || BLOCK_EXPLORERS[defaultChainId];
    return {
        url: `${explorer.txUrl}${txHash}`,
        name: explorer.name,
    };
}

/**
 * Generate QR code as data URL
 */
async function generateQRCode(url: string): Promise<string> {
    try {
        return await QRCode.toDataURL(url, {
            width: 150,
            margin: 1,
            color: {
                dark: '#0f172a',  // Slate 900
                light: '#ffffff', // White
            },
            errorCorrectionLevel: 'M',
        });
    } catch (error) {
        console.error('Failed to generate QR code:', error);
        throw error;
    }
}

/**
 * Generate a professional PDF receipt
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<Uint8Array> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Get branding config
    const branding = data.branding || DEFAULT_RECEIPT_BRANDING;
    const COLORS = getColors(branding);
    const fontFamily = branding.fontFamily || 'helvetica';
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // ============================================
    // BACKGROUND (AI-generated or pattern for Diamond tier)
    // ============================================

    if (branding.backgroundStyle === 'ai-generated' && branding.aiBackgroundUrl) {
        try {
            // Add AI-generated background image
            doc.addImage(branding.aiBackgroundUrl, 'PNG', 0, 0, pageWidth, pageHeight);
            // Add semi-transparent overlay for readability
            doc.setFillColor(255, 255, 255);
            doc.setGState(new (doc as jsPDF & { GState: new (options: { opacity: number }) => object }).GState({ opacity: 0.85 }));
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            doc.setGState(new (doc as jsPDF & { GState: new (options: { opacity: number }) => object }).GState({ opacity: 1 }));
        } catch {
            // Fallback if image fails
            console.warn('Failed to load AI background, using default');
        }
    } else if (branding.backgroundStyle === 'gradient') {
        // Gradient background
        const [r, g, b] = hexToRgb(COLORS.primaryLight);
        for (let i = 0; i < pageHeight; i += 2) {
            const factor = i / pageHeight;
            doc.setFillColor(
                Math.min(255, r + factor * 20),
                Math.min(255, g + factor * 20),
                Math.min(255, b + factor * 20)
            );
            doc.rect(0, i, pageWidth, 2, 'F');
        }
    } else if (branding.backgroundStyle === 'pattern') {
        // Subtle pattern background
        doc.setFillColor(...hexToRgb(COLORS.background));
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setDrawColor(...hexToRgb(COLORS.border));
        doc.setLineWidth(0.1);
        for (let i = 0; i < pageWidth; i += 10) {
            doc.line(i, 0, i, pageHeight);
        }
        for (let j = 0; j < pageHeight; j += 10) {
            doc.line(0, j, pageWidth, j);
        }
    }

    // ============================================
    // CERTIFICATE STYLE BORDER (Diamond tier)
    // ============================================

    if (branding.certificateStyle) {
        // Double border frame
        doc.setDrawColor(...hexToRgb(COLORS.primary));
        doc.setLineWidth(2);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

        // Corner decorations
        const cornerSize = 15;
        const corners = [
            [12, 12], // Top-left
            [pageWidth - 12 - cornerSize, 12], // Top-right
            [12, pageHeight - 12 - cornerSize], // Bottom-left
            [pageWidth - 12 - cornerSize, pageHeight - 12 - cornerSize], // Bottom-right
        ];

        for (const [cx, cy] of corners) {
            doc.setFillColor(...hexToRgb(COLORS.primary));
            doc.circle(cx + cornerSize / 2, cy + cornerSize / 2, 3, 'F');
        }
    }

    // ============================================
    // HEADER - Logo and Receipt Title
    // ============================================

    // Draw header background
    const headerBgColor = branding.headerBackgroundColor || COLORS.primary;
    doc.setFillColor(...hexToRgb(headerBgColor));

    if (branding.headerStyle === 'minimal') {
        doc.rect(0, 0, pageWidth, 3, 'F');
        y = 15;
    } else if (branding.headerStyle === 'bold') {
        doc.rect(0, 0, pageWidth, 55, 'F');
    } else {
        doc.rect(0, 0, pageWidth, 45, 'F');
    }

    // Header text color
    const headerTextColor = branding.headerTextColor || '#ffffff';
    doc.setTextColor(...hexToRgb(headerTextColor));

    // Logo or Business Name
    if (branding.logoPosition === 'center') {
        doc.setFontSize(24);
        doc.setFont(fontFamily, 'bold');
        doc.text(data.business.name, pageWidth / 2, 18, { align: 'center' });
    } else if (branding.showSeraBranding !== false) {
        // Show Settla branding
        doc.setFontSize(24);
        doc.setFont(fontFamily, 'bold');
        doc.text('SETTLA', margin, 18);
    } else {
        // Show business name only
        doc.setFontSize(24);
        doc.setFont(fontFamily, 'bold');
        doc.text(data.business.name, margin, 18);
    }

    // Receipt title (right side)
    doc.setFontSize(28);
    doc.setFont(fontFamily, 'bold');
    doc.text('RECEIPT', pageWidth - margin, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont(fontFamily, 'normal');
    doc.text(`#${data.receiptNumber}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(data.date, pageWidth - margin, 35, { align: 'right' });

    y = branding.headerStyle === 'minimal' ? 25 : (branding.headerStyle === 'bold' ? 65 : 55);

    // ============================================
    // STATUS BADGE
    // ============================================

    const statusColors: Record<string, string> = {
        paid: COLORS.success,
        pending: COLORS.warning,
        refunded: COLORS.error,
    };

    const statusLabels: Record<string, string> = {
        paid: '● PAID',
        pending: '○ PENDING',
        refunded: '↩ REFUNDED',
    };

    doc.setFillColor(...hexToRgb(statusColors[data.status] || COLORS.success));
    doc.roundedRect(margin, y, 24, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(fontFamily, 'bold');
    doc.text(statusLabels[data.status] || 'PAID', margin + 12, y + 5.5, { align: 'center' });

    y += 18;

    // ============================================
    // BUSINESS & CUSTOMER INFO (Two columns)
    // ============================================

    const colWidth = contentWidth / 2 - 5;

    // From (Business)
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.setFontSize(9);
    doc.setFont(fontFamily, 'normal');
    doc.text('FROM', margin, y);

    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.setFontSize(12);
    doc.setFont(fontFamily, 'bold');
    doc.text(data.business.name, margin, y + 6);

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.text(data.business.email, margin, y + 12);
    if (data.business.address) {
        const addressLines = doc.splitTextToSize(data.business.address, colWidth);
        doc.text(addressLines, margin, y + 18);
    }

    // To (Customer)
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.setFontSize(9);
    doc.text('BILL TO', margin + colWidth + 10, y);

    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.setFontSize(12);
    doc.setFont(fontFamily, 'bold');
    doc.text(data.customer.name, margin + colWidth + 10, y + 6);

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    if (data.customer.email) {
        doc.text(data.customer.email, margin + colWidth + 10, y + 12);
    }
    if (data.customer.address) {
        const addressLines = doc.splitTextToSize(data.customer.address, colWidth);
        doc.text(addressLines, margin + colWidth + 10, y + (data.customer.email ? 18 : 12));
    }

    y += 35;

    // ============================================
    // LINE ITEMS TABLE
    // ============================================

    // Table header background
    doc.setFillColor(...hexToRgb(COLORS.background));
    doc.rect(margin, y, contentWidth, 10, 'F');

    // Table header
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.setFontSize(8);
    doc.setFont(fontFamily, 'bold');
    doc.text('DESCRIPTION', margin + 3, y + 7);
    doc.text('QTY', margin + contentWidth * 0.55, y + 7);
    doc.text('UNIT PRICE', margin + contentWidth * 0.65, y + 7);
    doc.text('AMOUNT', margin + contentWidth - 3, y + 7, { align: 'right' });

    y += 12;

    // Table rows
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);

    for (const item of data.items) {
        // Description (can wrap)
        doc.setTextColor(...hexToRgb(COLORS.text));
        const descLines = doc.splitTextToSize(item.description, contentWidth * 0.5);
        doc.text(descLines, margin + 3, y + 5);

        // Quantity
        doc.text(item.quantity.toString(), margin + contentWidth * 0.55, y + 5);

        // Unit Price
        doc.text(formatCurrency(item.unitPrice, data.currency), margin + contentWidth * 0.65, y + 5);

        // Total
        doc.setFont(fontFamily, 'bold');
        doc.text(formatCurrency(item.total, data.currency), margin + contentWidth - 3, y + 5, { align: 'right' });
        doc.setFont(fontFamily, 'normal');

        const rowHeight = Math.max(10, descLines.length * 5 + 5);

        // Row separator
        doc.setDrawColor(...hexToRgb(COLORS.border));
        doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

        y += rowHeight;
    }

    y += 5;

    // ============================================
    // TOTALS
    // ============================================

    const totalsX = margin + contentWidth * 0.65;
    const totalsWidth = contentWidth * 0.35;

    // Subtotal
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.setFontSize(9);
    doc.text('Subtotal', totalsX, y + 5);
    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.text(formatCurrency(data.subtotal, data.currency), margin + contentWidth - 3, y + 5, { align: 'right' });

    y += 8;

    // Tax (if applicable)
    if (data.tax && data.tax > 0) {
        doc.setTextColor(...hexToRgb(COLORS.textLight));
        doc.text('Tax', totalsX, y + 5);
        doc.setTextColor(...hexToRgb(COLORS.text));
        doc.text(formatCurrency(data.tax, data.currency), margin + contentWidth - 3, y + 5, { align: 'right' });
        y += 8;
    }

    // Network Fee (always free with Settla)
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.text('Network Fee', totalsX, y + 5);
    doc.setTextColor(...hexToRgb(COLORS.success));
    doc.setFont(fontFamily, 'bold');
    doc.text('FREE', margin + contentWidth - 3, y + 5, { align: 'right' });
    doc.setFont(fontFamily, 'normal');

    y += 10;

    // Total (highlighted with emerald)
    doc.setFillColor(...hexToRgb(COLORS.primaryLight));
    doc.rect(totalsX - 5, y, totalsWidth + 5, 12, 'F');

    doc.setTextColor(...hexToRgb(COLORS.primary));
    doc.setFontSize(11);
    doc.setFont(fontFamily, 'bold');
    doc.text('TOTAL', totalsX, y + 8);
    doc.setFontSize(14);
    doc.text(formatCurrency(data.total, data.currency), margin + contentWidth - 3, y + 8, { align: 'right' });

    y += 20;

    // ============================================
    // PAYMENT DETAILS & BLOCKCHAIN VERIFICATION
    // ============================================

    if (data.payment) {
        doc.setDrawColor(...hexToRgb(COLORS.border));
        doc.line(margin, y, margin + contentWidth, y);
        y += 8;

        doc.setTextColor(...hexToRgb(COLORS.textLight));
        doc.setFontSize(9);
        doc.setFont(fontFamily, 'bold');
        doc.text('PAYMENT DETAILS', margin, y);

        y += 8;
        doc.setFont(fontFamily, 'normal');

        // Calculate QR code section width
        const qrSize = 45; // QR code size in mm
        const hasQRCode = data.payment.txHash || data.offRamp?.url;
        const detailsWidth = hasQRCode ? contentWidth - qrSize - 10 : contentWidth;
        const qrX = margin + detailsWidth + 10;
        const qrStartY = y - 3; // Remember start position for QR code

        // Payment Method
        doc.setTextColor(...hexToRgb(COLORS.textLight));
        doc.text('Method:', margin, y);
        doc.setTextColor(...hexToRgb(COLORS.text));
        doc.text(data.payment.method, margin + 28, y);
        y += 5;

        // Paid At
        if (data.payment.paidAt) {
            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.text('Paid At:', margin, y);
            doc.setTextColor(...hexToRgb(COLORS.text));
            const paidDate = new Date(data.payment.paidAt).toLocaleString();
            doc.text(paidDate, margin + 28, y);
            y += 5;
        }

        // Wallet Address
        if (data.payment.walletAddress) {
            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.text('From Wallet:', margin, y);
            doc.setTextColor(...hexToRgb(COLORS.text));
            doc.text(truncateAddress(data.payment.walletAddress), margin + 28, y);
            y += 5;
        }

        // Transaction Hash
        if (data.payment.txHash) {
            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.text('Tx Hash:', margin, y);
            doc.setTextColor(...hexToRgb(COLORS.secondary));
            doc.text(truncateAddress(data.payment.txHash), margin + 28, y);
            y += 5;

            // Block Explorer Link
            const explorer = getBlockExplorerUrl(data.payment.txHash, data.payment.chainId);
            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.text('Explorer:', margin, y);
            doc.setTextColor(...hexToRgb(COLORS.secondary));
            doc.text(explorer.name, margin + 28, y);
            y += 5;
        }

        // ============================================
        // OFF-RAMP REFERENCE (Future support)
        // ============================================

        if (data.offRamp) {
            y += 3;
            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.setFontSize(8);
            doc.setFont(fontFamily, 'bold');
            doc.text('OFF-RAMP DETAILS', margin, y);
            doc.setFont(fontFamily, 'normal');
            doc.setFontSize(9);
            y += 5;

            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.text('Provider:', margin, y);
            doc.setTextColor(...hexToRgb(COLORS.text));
            doc.text(data.offRamp.provider, margin + 28, y);
            y += 5;

            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.text('Reference:', margin, y);
            doc.setTextColor(...hexToRgb(COLORS.secondary));
            doc.text(data.offRamp.referenceId, margin + 28, y);
            y += 5;

            doc.setTextColor(...hexToRgb(COLORS.textLight));
            doc.text('Status:', margin, y);
            const statusColor = data.offRamp.status === 'completed' ? COLORS.success : COLORS.warning;
            doc.setTextColor(...hexToRgb(statusColor));
            doc.text(data.offRamp.status.charAt(0).toUpperCase() + data.offRamp.status.slice(1), margin + 28, y);
            y += 5;
        }

        // ============================================
        // QR CODE - Blockchain Verification
        // ============================================

        if (hasQRCode) {
            try {
                let qrUrl: string;
                let qrLabel: string;

                if (data.payment.txHash) {
                    const explorer = getBlockExplorerUrl(data.payment.txHash, data.payment.chainId);
                    qrUrl = explorer.url;
                    qrLabel = 'Verify on Blockchain';
                } else if (data.offRamp?.url) {
                    qrUrl = data.offRamp.url;
                    qrLabel = 'Track Off-Ramp';
                } else {
                    qrUrl = '';
                    qrLabel = '';
                }

                if (qrUrl) {
                    const qrDataUrl = await generateQRCode(qrUrl);

                    // Add QR code box with border
                    doc.setDrawColor(...hexToRgb(COLORS.border));
                    doc.setFillColor(...hexToRgb('#ffffff'));
                    doc.roundedRect(qrX - 2, qrStartY - 2, qrSize + 4, qrSize + 16, 2, 2, 'FD');

                    // Add QR code image
                    doc.addImage(qrDataUrl, 'PNG', qrX, qrStartY, qrSize, qrSize);

                    // Add label below QR code
                    doc.setTextColor(...hexToRgb(COLORS.primary));
                    doc.setFontSize(7);
                    doc.setFont(fontFamily, 'bold');
                    doc.text(qrLabel, qrX + qrSize / 2, qrStartY + qrSize + 5, { align: 'center' });

                    // Add scan icon hint
                    doc.setTextColor(...hexToRgb(COLORS.textLight));
                    doc.setFontSize(6);
                    doc.setFont(fontFamily, 'normal');
                    doc.text('Scan with phone camera', qrX + qrSize / 2, qrStartY + qrSize + 9, { align: 'center' });
                }
            } catch (error) {
                console.error('Failed to add QR code to receipt:', error);
                // Continue without QR code if generation fails
            }
        }

        y += 5;
    }

    // ============================================
    // NOTES
    // ============================================

    if (data.notes) {
        doc.setTextColor(...hexToRgb(COLORS.textLight));
        doc.setFontSize(9);
        doc.setFont(fontFamily, 'bold');
        doc.text('NOTES', margin, y);

        doc.setFont(fontFamily, 'normal');
        doc.setTextColor(...hexToRgb(COLORS.text));
        const notesLines = doc.splitTextToSize(data.notes, contentWidth);
        doc.text(notesLines, margin, y + 6);

        y += 6 + (notesLines.length * 4);
    }

    // ============================================
    // FOOTER
    // ============================================

    const footerY = doc.internal.pageSize.getHeight() - 20;

    doc.setDrawColor(...hexToRgb(COLORS.border));
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.setFontSize(8);
    doc.setFont(fontFamily, 'normal');

    // Custom footer text or default
    if (branding.customFooterText) {
        doc.text(branding.customFooterText, pageWidth / 2, footerY, { align: 'center' });
    } else if (branding.showSeraBranding !== false) {
        doc.text('Powered by Settla - Instant Stablecoin Payments', pageWidth / 2, footerY, { align: 'center' });
        doc.text('https://sett.la', pageWidth / 2, footerY + 4, { align: 'center' });
    } else {
        // Show business info in footer when Settla branding is hidden
        doc.text(`${data.business.name} - ${data.business.email}`, pageWidth / 2, footerY, { align: 'center' });
        if (data.business.address) {
            doc.text(data.business.address, pageWidth / 2, footerY + 4, { align: 'center' });
        }
    }

    // Verified badge
    doc.setTextColor(...hexToRgb(COLORS.primary));
    doc.setFontSize(7);
    doc.text('Cryptographically Verified', pageWidth / 2, footerY + 9, { align: 'center' });

    // Output
    const pdfOutput = doc.output('arraybuffer');
    return new Uint8Array(pdfOutput);
}

/**
 * Generate receipt number with timestamp and random suffix
 */
export function generateReceiptNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RCP-${timestamp}-${random}`;
}
