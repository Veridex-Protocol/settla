"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  CreditCard, 
  Receipt, 
  Users, 
  BarChart3, 
  Link2, 
  Search,
  Inbox,
  FolderOpen,
  type LucideIcon 
} from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "invoices" | "transactions" | "receipts" | "team" | "analytics" | "payments" | "search";
  className?: string;
}

const variantIcons: Record<string, LucideIcon> = {
  default: Inbox,
  invoices: FileText,
  transactions: CreditCard,
  receipts: Receipt,
  team: Users,
  analytics: BarChart3,
  payments: Link2,
  search: Search,
};

const variantColors: Record<string, string> = {
  default: "from-zinc-500/20 to-zinc-600/20",
  invoices: "from-emerald-500/20 to-cyan-500/20",
  transactions: "from-blue-500/20 to-indigo-500/20",
  receipts: "from-amber-500/20 to-orange-500/20",
  team: "from-purple-500/20 to-pink-500/20",
  analytics: "from-cyan-500/20 to-teal-500/20",
  payments: "from-emerald-500/20 to-green-500/20",
  search: "from-zinc-500/20 to-zinc-600/20",
};

const variantIconColors: Record<string, string> = {
  default: "text-zinc-400",
  invoices: "text-emerald-400",
  transactions: "text-blue-400",
  receipts: "text-amber-400",
  team: "text-purple-400",
  analytics: "text-cyan-400",
  payments: "text-emerald-400",
  search: "text-zinc-400",
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant] || Inbox;
  const gradientColor = variantColors[variant] || variantColors.default;
  const iconColor = variantIconColors[variant] || variantIconColors.default;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        "animate-fade-in-up",
        className
      )}
    >
      {/* Decorative background */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-2xl opacity-50",
            `bg-gradient-to-br ${gradientColor}`
          )}
          style={{ transform: "scale(1.5)" }}
        />
        
        {/* Icon container */}
        <div
          className={cn(
            "relative w-20 h-20 rounded-2xl flex items-center justify-center",
            "bg-zinc-800/50 border border-zinc-700/50",
            "shadow-lg"
          )}
        >
          <Icon className={cn("w-10 h-10", iconColor)} strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-zinc-100 mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-zinc-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Specialized empty states for common use cases
export function EmptyInvoices({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      variant="invoices"
      title="No invoices yet"
      description="Create your first invoice to start getting paid. Invoices are automatically tracked and synced."
      actionLabel="Create Invoice"
      onAction={onAction}
    />
  );
}

export function EmptyTransactions() {
  return (
    <EmptyState
      variant="transactions"
      title="No transactions"
      description="Transactions will appear here once you start receiving payments through your invoices or payment links."
    />
  );
}

export function EmptyReceipts({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      variant="receipts"
      title="No receipts generated"
      description="Receipts are automatically created when payments are confirmed on the blockchain."
      actionLabel="View Payment Links"
      onAction={onAction}
    />
  );
}

export function EmptyTeam({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      variant="team"
      title="Build your team"
      description="Invite team members to help manage payments, invoices, and customer relationships."
      actionLabel="Invite Member"
      onAction={onAction}
    />
  );
}

export function EmptyPaymentLinks({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      variant="payments"
      title="No payment links"
      description="Create shareable payment links to accept crypto payments from anyone, anywhere."
      actionLabel="Create Payment Link"
      onAction={onAction}
    />
  );
}

export function EmptySearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      variant="search"
      icon={FolderOpen}
      title="No results found"
      description={query ? `We couldn't find anything matching "${query}". Try adjusting your search or filters.` : "Try adjusting your search or filters to find what you're looking for."}
    />
  );
}
