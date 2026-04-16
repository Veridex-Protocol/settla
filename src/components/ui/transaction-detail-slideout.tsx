"use client";

import * as React from "react";
import { X, ExternalLink, Copy, Check, Clock, ArrowUpRight, ArrowDownRight, Wallet, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  type: "inflow" | "outflow";
  amount: number;
  currency: string;
  status: "pending" | "confirmed" | "failed" | "settled";
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentLinkId?: string;
  paymentLinkName?: string;
  network?: string;
  fee?: number;
}

interface TransactionDetailSlideoutProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailSlideout({ transaction, isOpen, onClose }: TransactionDetailSlideoutProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusColor = (status: Transaction["status"]) => {
    switch (status) {
      case "confirmed":
      case "settled":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const getStatusIcon = (status: Transaction["status"]) => {
    switch (status) {
      case "confirmed":
      case "settled":
        return <Check className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "failed":
        return <X className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getExplorerUrl = (txHash: string) => {
    // Default to Sepolia Etherscan for Sera
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  if (!transaction) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slideout Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                transaction.type === "inflow"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              )}
            >
              {transaction.type === "inflow" ? (
                <ArrowDownRight className="h-5 w-5" />
              ) : (
                <ArrowUpRight className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {transaction.type === "inflow" ? "Received" : "Sent"}
              </h2>
              <p className="text-sm text-zinc-400">Transaction Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-80px)]">
          {/* Amount */}
          <div className="text-center py-6 px-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/50">
            <p
              className={cn(
                "text-4xl font-bold tabular-nums",
                transaction.type === "inflow" ? "text-emerald-400" : "text-red-400"
              )}
            >
              {transaction.type === "inflow" ? "+" : "-"}${transaction.amount.toLocaleString()}
            </p>
            <p className="text-zinc-400 mt-1">{transaction.currency}</p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Status</span>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
                getStatusColor(transaction.status)
              )}
            >
              {getStatusIcon(transaction.status)}
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Date & Time</span>
            <span className="text-sm text-white">
              {new Date(transaction.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Transaction Hash */}
          {transaction.txHash && (
            <div className="space-y-2">
              <span className="text-sm text-zinc-400">Transaction Hash</span>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <code className="flex-1 text-sm text-white font-mono truncate">
                  {transaction.txHash}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.txHash!, "txHash")}
                  className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied === "txHash" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={getExplorerUrl(transaction.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Addresses */}
          {transaction.fromAddress && (
            <div className="space-y-2">
              <span className="text-sm text-zinc-400">From Address</span>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <Wallet className="h-4 w-4 text-zinc-500" />
                <code className="flex-1 text-sm text-white font-mono">
                  {formatAddress(transaction.fromAddress)}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.fromAddress!, "from")}
                  className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied === "from" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {transaction.toAddress && (
            <div className="space-y-2">
              <span className="text-sm text-zinc-400">To Address</span>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <Wallet className="h-4 w-4 text-zinc-500" />
                <code className="flex-1 text-sm text-white font-mono">
                  {formatAddress(transaction.toAddress)}
                </code>
                <button
                  onClick={() => copyToClipboard(transaction.toAddress!, "to")}
                  className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied === "to" ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Network Fee */}
          {transaction.fee !== undefined && transaction.fee > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Network Fee</span>
              <span className="text-sm text-white">
                ${transaction.fee.toFixed(4)} {transaction.currency}
              </span>
            </div>
          )}

          {/* Network */}
          {transaction.network && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Network</span>
              <span className="text-sm text-white">{transaction.network}</span>
            </div>
          )}

          {/* Related Items */}
          {(transaction.invoiceId || transaction.paymentLinkId) && (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <span className="text-sm text-zinc-400 font-medium">Related</span>
              
              {transaction.invoiceId && (
                <a
                  href={`/dashboard/invoices/${transaction.invoiceId}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50 transition-colors group"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                      Invoice {transaction.invoiceNumber || `#${transaction.invoiceId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-zinc-400">View invoice details</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                </a>
              )}

              {transaction.paymentLinkId && (
                <a
                  href={`/dashboard/payment-links`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50 transition-colors group"
                >
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                      {transaction.paymentLinkName || "Payment Link"}
                    </p>
                    <p className="text-xs text-zinc-400">View payment link</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
                </a>
              )}
            </div>
          )}

          {/* Description */}
          {transaction.description && (
            <div className="space-y-2">
              <span className="text-sm text-zinc-400">Description</span>
              <p className="text-sm text-white p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                {transaction.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
