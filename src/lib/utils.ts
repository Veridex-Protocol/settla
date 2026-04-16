import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency: string = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "USDC" || currency === "EURC" || currency === "XSGD" ? "USD" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(num).replace("$", `${currency} `);
}

export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function generateShortCode(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `INV-${year}${month}-${random}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const SUPPORTED_CURRENCIES = [
  { symbol: "USDC", name: "USD Coin", decimals: 6 },
  { symbol: "EURC", name: "Euro Coin", decimals: 6 },
  { symbol: "XSGD", name: "Singapore Dollar Token", decimals: 6 },
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]["symbol"];

export const INVOICE_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  SETTLED: "settled",
  CANCELLED: "cancelled",
  OVERDUE: "overdue",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const TRANSACTION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  SETTLED: "settled",
  FAILED: "failed",
} as const;

export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

export const PAYMENT_LINK_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type PaymentLinkStatus = (typeof PAYMENT_LINK_STATUS)[keyof typeof PAYMENT_LINK_STATUS];
