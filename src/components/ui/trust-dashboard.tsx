"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Shield,
  Lock,
  Zap,
  Eye,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Info,
  Wallet,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui";

interface TrustDashboardProps {
  className?: string;
  compact?: boolean;
  walletAddress?: string;
}

const trustPoints = [
  {
    icon: Lock,
    title: "Non-Custodial",
    description: "We never hold your funds. Payments settle directly to your wallet.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    description: "Funds arrive in seconds, not days. No rolling reserves or holds.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    description: "Every transaction is verifiable on-chain. No hidden fees.",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "Passkey authentication (FaceID/TouchID) - no seed phrases to lose.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
];

export function TrustDashboard({ className, compact, walletAddress }: TrustDashboardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-900/10 to-cyan-900/10 border border-emerald-500/20",
          className
        )}
      >
        <div className="flex -space-x-2">
          {trustPoints.slice(0, 3).map((point, i) => (
            <Tooltip key={point.title}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 border-zinc-900",
                    point.bgColor
                  )}
                  style={{ zIndex: 3 - i }}
                >
                  <point.icon className={cn("h-4 w-4", point.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{point.title}</p>
                <p className="text-xs text-zinc-400">{point.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">100% Non-Custodial</p>
          <p className="text-xs text-zinc-400">Your funds, your wallet</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <Info className="h-4 w-4 text-zinc-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Sera is completely non-custodial. We never have access to your funds. All payments settle directly to your connected wallet.</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-emerald-900/20 to-cyan-900/20">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Trust & Transparency
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </h3>
            <p className="text-sm text-zinc-400">
              Your funds are always under your control
            </p>
          </div>
        </div>
      </div>

      {/* Trust Points Grid */}
      <div className="grid grid-cols-2 gap-px bg-zinc-800">
        {trustPoints.map((point) => (
          <div key={point.title} className="p-5 bg-zinc-900/80">
            <div className={cn("h-10 w-10 rounded-xl mb-3 flex items-center justify-center", point.bgColor)}>
              <point.icon className={cn("h-5 w-5", point.color)} />
            </div>
            <h4 className="font-medium text-white mb-1">{point.title}</h4>
            <p className="text-sm text-zinc-400">{point.description}</p>
          </div>
        ))}
      </div>

      {/* Wallet Info */}
      {walletAddress && (
        <div className="p-6 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm text-zinc-400">Settlement Wallet</p>
                <p className="font-mono text-sm text-white">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>
            </div>
            <a
              href={`https://basescan.org/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="gap-2 text-zinc-400">
                View on Explorer
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Fund Flow Visualization */}
      <div className="p-6 border-t border-zinc-800">
        <p className="text-sm font-medium text-zinc-400 mb-4">How Payments Flow</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
              <span className="text-lg">👤</span>
            </div>
            <p className="text-xs text-zinc-400">Customer</p>
          </div>
          
          <ArrowRight className="h-5 w-5 text-zinc-600 flex-shrink-0" />
          
          <div className="flex-1 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-cyan-500/10 flex items-center justify-center mb-2">
              <span className="text-lg">⛓️</span>
            </div>
            <p className="text-xs text-zinc-400">Blockchain</p>
          </div>
          
          <ArrowRight className="h-5 w-5 text-zinc-600 flex-shrink-0" />
          
          <div className="flex-1 text-center relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <span className="text-3xl">🚫</span>
            </div>
            <div className="h-12 w-12 mx-auto rounded-xl bg-zinc-700/50 flex items-center justify-center mb-2 border-2 border-dashed border-zinc-600">
              <span className="text-lg opacity-50">🏦</span>
            </div>
            <p className="text-xs text-zinc-500 line-through">Sera (skip)</p>
          </div>
          
          <ArrowRight className="h-5 w-5 text-zinc-600 flex-shrink-0" />
          
          <div className="flex-1 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
              <Wallet className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-400 font-medium">Your Wallet</p>
          </div>
        </div>
        <p className="text-xs text-center text-zinc-500 mt-4">
          Funds go directly from customer → blockchain → your wallet. We never touch them.
        </p>
      </div>
    </div>
  );
}

// Simple trust badge for use in headers/footers
export function TrustBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30",
            className
          )}
        >
          <Shield className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Non-Custodial</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>We never hold your funds. All payments settle directly to your wallet.</p>
      </TooltipContent>
    </Tooltip>
  );
}
