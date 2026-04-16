/**
 * PDF Invoice Generator for Settla Dashboard
 * 
 * Creates professionally styled PDF invoices using jsPDF
 * Supports custom branding for Silver+ tier merchants
 */

import { jsPDF } from 'jspdf';
import {
    InvoiceBrandingConfig,
    ColorPalette,
    DEFAULT_INVOICE_BRANDING,
    DEFAULT_INVOICE_COLORS,
} from './services/branding-service';

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface InvoiceData {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    business: {
        name: string;
        email: string;
        address?: string;
        logo?: string;
    };
    customer: {
        name: string;
        email?: string;
        address?: string;
    };
    items: InvoiceItem[];
    subtotal: number;
    tax?: number;
    total: number;
    currency: string;
    notes?: string;
    // Custom branding (Silver+ tier)
    branding?: InvoiceBrandingConfig;
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
 * Get colors from branding config
 */
function getColors(branding?: InvoiceBrandingConfig): ColorPalette {
    return branding?.colorPalette || DEFAULT_INVOICE_COLORS;
}

/**
 * Generate a professional PDF invoice
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Get branding config
    const branding = data.branding || DEFAULT_INVOICE_BRANDING;
    const COLORS = getColors(branding);

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Set font family
    const fontFamily = branding.fontFamily || 'helvetica';

    // ============================================
    // HEADER - Logo and Invoice Title
    // ============================================

    // Draw header background
    const headerBgColor = branding.headerBackgroundColor || COLORS.primary;
    doc.setFillColor(...hexToRgb(headerBgColor));

    if (branding.headerStyle === 'gradient') {
        // Simulate gradient with multiple rectangles
        for (let i = 0; i < 10; i++) {
            const alpha = 1 - (i * 0.1);
            const [r, g, b] = hexToRgb(headerBgColor);
            doc.setFillColor(Math.min(255, r + i * 5), Math.min(255, g + i * 5), Math.min(255, b + i * 5));
            doc.rect(0, i * 4.5, pageWidth, 4.5, 'F');
        }
    } else if (branding.headerStyle === 'minimal') {
        // Just a thin colored line
        doc.rect(0, 0, pageWidth, 3, 'F');
        y = 15;
    } else if (branding.headerStyle === 'bold') {
        // Larger header
        doc.rect(0, 0, pageWidth, 55, 'F');
    } else {
        // Default header
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
    } else if (branding.logoPosition === 'right') {
        doc.setFontSize(24);
        doc.setFont(fontFamily, 'bold');
        doc.text(data.business.name, pageWidth - margin, 18, { align: 'right' });

        // Invoice title on left
        doc.setFontSize(28);
        doc.text('INVOICE', margin, 20);
    } else {
        // Default: Logo on left
        if (branding.showSeraBranding !== false) {
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

        // Invoice title (right side)
        doc.setFontSize(28);
        doc.setFont(fontFamily, 'bold');
        doc.text('INVOICE', pageWidth - margin, 20, { align: 'right' });
    }

    doc.setFontSize(10);
    doc.setFont(fontFamily, 'normal');
    doc.text(`#${data.invoiceNumber}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(`Issued: ${data.issueDate}`, pageWidth - margin, 35, { align: 'right' });

    y = branding.headerStyle === 'minimal' ? 25 : (branding.headerStyle === 'bold' ? 65 : 55);

    // ============================================
    // STATUS BADGE
    // ============================================

    const statusColors: Record<string, string> = {
        paid: COLORS.success,
        sent: COLORS.primary,
        draft: COLORS.textLight,
        overdue: COLORS.error,
        cancelled: COLORS.error,
    };

    const statusLabels: Record<string, string> = {
        paid: '● PAID',
        sent: '◉ SENT',
        draft: '○ DRAFT',
        overdue: '! OVERDUE',
        cancelled: '✕ CANCELLED',
    };

    doc.setFillColor(...hexToRgb(statusColors[data.status] || COLORS.textLight));
    doc.roundedRect(margin, y, 28, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(fontFamily, 'bold');
    doc.text(statusLabels[data.status] || data.status.toUpperCase(), margin + 14, y + 5.5, { align: 'center' });

    // Due date (if present)
    if (data.dueDate) {
        doc.setTextColor(...hexToRgb(COLORS.text));
        doc.setFontSize(10);
        doc.setFont(fontFamily, 'normal');
        doc.text(`Due: ${data.dueDate}`, pageWidth - margin, y + 5, { align: 'right' });
    }

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
    doc.text('TOTAL', margin + contentWidth - 3, y + 7, { align: 'right' });

    y += 12;

    // Table rows
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);

    const validItems = data.items.filter(item => item.description && item.unitPrice > 0);

    for (const item of validItems) {
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

    // Total (highlighted)
    y += 2;
    doc.setFillColor(...hexToRgb(COLORS.primaryLight));
    doc.rect(totalsX - 5, y, totalsWidth + 5, 12, 'F');

    doc.setTextColor(...hexToRgb(COLORS.primary));
    doc.setFontSize(11);
    doc.setFont(fontFamily, 'bold');
    doc.text('TOTAL DUE', totalsX, y + 8);
    doc.setFontSize(14);
    doc.text(formatCurrency(data.total, data.currency), margin + contentWidth - 3, y + 8, { align: 'right' });

    y += 20;

    // ============================================
    // PAYMENT INSTRUCTIONS
    // ============================================

    doc.setFillColor(...hexToRgb(COLORS.background));
    doc.rect(margin, y, contentWidth, 25, 'F');

    doc.setTextColor(...hexToRgb(COLORS.text));
    doc.setFontSize(10);
    doc.setFont(fontFamily, 'bold');
    doc.text('Payment Instructions', margin + 5, y + 8);

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.text('Pay with stablecoins (USDC, EURC, XSGD) via Settla.', margin + 5, y + 16);
    doc.text('A payment link will be sent with this invoice.', margin + 5, y + 22);

    y += 30;

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

    const footerY = doc.internal.pageSize.getHeight() - 15;

    doc.setDrawColor(...hexToRgb(COLORS.border));
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setTextColor(...hexToRgb(COLORS.textLight));
    doc.setFontSize(8);
    doc.setFont(fontFamily, 'normal');

    // Custom footer text or default
    if (branding.customFooterText) {
        doc.text(branding.customFooterText, pageWidth / 2, footerY, { align: 'center' });
    } else if (branding.showSeraBranding !== false) {
        doc.text('Generated by Settla - Stablecoin Payments Made Simple', pageWidth / 2, footerY, { align: 'center' });
        doc.text('https://sett.la', pageWidth / 2, footerY + 4, { align: 'center' });
    } else {
        // Show business info in footer when Settla branding is hidden
        doc.text(`${data.business.name} - ${data.business.email}`, pageWidth / 2, footerY, { align: 'center' });
        if (data.business.address) {
            doc.text(data.business.address, pageWidth / 2, footerY + 4, { align: 'center' });
        }
    }

    // Output
    const pdfOutput = doc.output('arraybuffer');
    return new Uint8Array(pdfOutput);
}
