"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Separator,
  AnimatedCurrency,
  AnimatedCounter,
  SkeletonStats,
  SkeletonList,
  OnboardingChecklist,
  Celebrate,
  FeeSavingsCard,
  TierProgress,
  TierBadge,
  ReferralWidget,
  TrustBadge,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  FileText,
  Plus,
  ArrowRight,
  Clock,
  ExternalLink,
  Zap,
  Link2,
  Receipt,
  Sparkles,
  RefreshCw,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, formatDateTime, formatAddress } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  from: string;
  description: string;
  timestamp: string;
  txHash?: string;
}

interface PendingInvoice {
  id: string;
  number: string;
  customer: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: string;
}

interface DashboardStats {
  totalRevenue: { value: number; currency: string; change: number };
  pendingPayments: { value: number; currency: string; change: number };
  thisMonth: { value: number; currency: string; change: number };
  transactionCount: { value: number; change: number };
}

const statusColors: Record<string, "success" | "warning" | "destructive" | "info" | "default"> = {
  settled: "success",
  confirmed: "info",
  pending: "warning",
  failed: "destructive",
  sent: "info",
  overdue: "destructive",
  paid: "success",
  draft: "default",
};

// Gamification data types
interface GamificationData {
  tier: {
    currentTier: string;
    currentVolume: number;
    nextTier: string | null;
    volumeToNextTier: number | null;
    progress: number;
  } | null;
  streak: {
    current: number;
    longest: number;
    increased: boolean;
  };
  points: {
    balance: number;
  };
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Gamification state
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAmount, setCelebrationAmount] = useState<number | undefined>();

  const fetchDashboardData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [statsRes, recentRes, gamificationRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/recent"),
        fetch("/api/gamification"),
      ]);

      if (!statsRes.ok || !recentRes.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const statsData = await statsRes.json();
      const recentData = await recentRes.json();

      setStats(statsData);
      setRecentTransactions(recentData.transactions || []);
      setPendingInvoices(recentData.pendingInvoices || []);

      // Handle gamification data
      if (gamificationRes.ok) {
        const gamificationData = await gamificationRes.json();
        setGamification(gamificationData);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Stats card component with animations
  const StatCard = ({
    title,
    value,
    currency,
    change,
    icon,
    tooltip,
    delay = 0,
  }: {
    title: string;
    value: number;
    currency?: string;
    change: number;
    icon: React.ReactNode;
    tooltip: string;
    delay?: number;
  }) => {
    const isPositive = change >= 0;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="opacity-0 animate-fade-in-up card-hover"
            style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
          >
            <Card variant="glass" className="relative overflow-hidden group">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:to-cyan-500/5 transition-all duration-500" />

              <CardContent className="p-3 sm:p-6 relative">
                <div className="flex items-start justify-between mb-2 sm:mb-4">
                  <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center text-emerald-400">
                    {icon}
                  </div>
                  <div
                    className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${isPositive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                      }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    )}
                    {Math.abs(change).toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-[10px] sm:text-sm text-zinc-400 truncate">{title}</p>
                  <p className="text-lg sm:text-3xl font-bold text-white tabular-nums">
                    {currency ? (
                      <AnimatedCurrency value={value} currency={currency} />
                    ) : (
                      <AnimatedCounter value={value} />
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header
          title="Dashboard"
          description="Loading your business overview..."
        />
        <div className="p-6 space-y-6">
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonStats key={i} className={`stagger-${i}`} />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card variant="glass">
                <CardHeader>
                  <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <SkeletonList items={4} />
                </CardContent>
              </Card>
            </div>
            <Card variant="glass">
              <CardHeader>
                <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <SkeletonList items={3} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <Header
          title="Dashboard"
          description="Welcome back! Here's your business overview."
        />
        <div className="p-6">
          <Card variant="glass" className="border-red-500/30">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                <ExternalLink className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Unable to load dashboard</h3>
              <p className="text-zinc-400 mb-6">{error}</p>
              <Button onClick={() => fetchDashboardData()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Celebration Animation */}
      <Celebrate
        show={showCelebration}
        amount={celebrationAmount}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Hero Header with Greeting */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/30 via-transparent to-cyan-950/20" />

        <Header
          title={
            <span className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-400" />
              {getGreeting()}
              {gamification?.tier?.currentTier && (
                <TierBadge tier={gamification.tier.currentTier.toLowerCase() as "bronze" | "silver" | "gold" | "diamond"} size="sm" />
              )}
            </span>
          }
          description={
            <span className="flex items-center gap-3">
              Here's what's happening with your business today
              {gamification?.streak?.current && gamification.streak.current > 1 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-medium text-orange-400">
                  <Flame className="h-3 w-3" />
                  {gamification.streak.current} day streak
                </span>
              )}
              {gamification?.points?.balance !== undefined && gamification.points.balance > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-medium text-purple-400">
                  ⭐ {gamification.points.balance} pts
                </span>
              )}
            </span>
          }
          actions={
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <TrustBadge className="hidden sm:flex" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchDashboardData(true)}
                    disabled={isRefreshing}
                    className="border-zinc-700 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh data</TooltipContent>
              </Tooltip>
              <Link href="/dashboard/invoices/new">
                <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-sm sm:text-base px-3 sm:px-4">
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">New</span> Invoice
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Onboarding Checklist - shows only if not completed */}
        <OnboardingChecklist className="mb-2" />
        {/* Stats Grid with staggered animation */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={stats?.totalRevenue.value || 0}
            currency={stats?.totalRevenue.currency || "USDC"}
            change={stats?.totalRevenue.change || 0}
            icon={<DollarSign className="h-6 w-6" />}
            tooltip="All-time total revenue received"
            delay={0}
          />
          <StatCard
            title="Pending Payments"
            value={stats?.pendingPayments.value || 0}
            currency={stats?.pendingPayments.currency || "USDC"}
            change={stats?.pendingPayments.change || 0}
            icon={<Clock className="h-6 w-6" />}
            tooltip="Total amount awaiting payment"
            delay={50}
          />
          <StatCard
            title="This Month"
            value={stats?.thisMonth.value || 0}
            currency={stats?.thisMonth.currency || "USDC"}
            change={stats?.thisMonth.change || 0}
            icon={<TrendingUp className="h-6 w-6" />}
            tooltip="Revenue collected this month"
            delay={100}
          />
          <StatCard
            title="Transactions"
            value={stats?.transactionCount.value || 0}
            change={stats?.transactionCount.change || 0}
            icon={<ArrowRightLeft className="h-6 w-6" />}
            tooltip="Total number of transactions"
            delay={150}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Transactions */}
          <Card
            variant="glass"
            className="lg:col-span-2 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Your latest payment activity</CardDescription>
              </div>
              <Link href="/dashboard/transactions">
                <Button variant="ghost" size="sm" className="gap-1 text-zinc-400 hover:text-white">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <ArrowRightLeft className="h-8 w-8 text-zinc-500" />
                  </div>
                  <h4 className="text-lg font-medium text-white mb-2">No transactions yet</h4>
                  <p className="text-zinc-400 text-sm max-w-sm mx-auto mb-6">
                    Transactions will appear here once you start receiving payments through invoices or payment links
                  </p>
                  <Link href="/dashboard/payments">
                    <Button variant="outline" className="gap-2">
                      <Link2 className="h-4 w-4" />
                      Create Payment Link
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((txn, index) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between rounded-xl bg-zinc-800/50 p-4 transition-all hover:bg-zinc-700/50 hover:scale-[1.01] group"
                      style={{ animationDelay: `${250 + index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${txn.type === "inflow"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                            }`}
                        >
                          {txn.type === "inflow" ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <ArrowRightLeft className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{txn.description}</p>
                          <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <span className="font-mono">{formatAddress(txn.from)}</span>
                            <span>•</span>
                            <span>{formatDateTime(new Date(txn.timestamp))}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p
                            className={`font-semibold tabular-nums ${txn.type === "inflow" ? "text-emerald-400" : "text-red-400"
                              }`}
                          >
                            {txn.type === "inflow" ? "+" : "-"}
                            {formatCurrency(txn.amount, txn.currency)}
                          </p>
                          <Badge variant={statusColors[txn.status]} dot className="mt-1">
                            {txn.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card
            variant="glass"
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: "250ms", animationFillMode: "forwards" }}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-400" />
                  Pending Invoices
                </CardTitle>
                <CardDescription>Awaiting payment</CardDescription>
              </div>
              <Link href="/dashboard/invoices">
                <Button variant="ghost" size="sm" className="gap-1 text-zinc-400 hover:text-white">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {pendingInvoices.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-7 w-7 text-zinc-500" />
                  </div>
                  <h4 className="font-medium text-white mb-2">No pending invoices</h4>
                  <p className="text-zinc-400 text-sm mb-4">All invoices have been paid</p>
                  <Link href="/dashboard/invoices/new">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Invoice
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvoices.map((inv, index) => (
                    <div
                      key={inv.id}
                      className="rounded-xl bg-zinc-800/50 p-4 transition-all hover:bg-zinc-700/50 hover:scale-[1.02] group"
                      style={{ animationDelay: `${300 + index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-white">{inv.customer}</p>
                          <p className="text-sm text-zinc-500 font-mono">{inv.number}</p>
                        </div>
                        <Badge variant={statusColors[inv.status]} dot>
                          {inv.status}
                        </Badge>
                      </div>
                      <Separator className="my-3 bg-zinc-700/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">
                          Due {formatDate(new Date(inv.dueDate))}
                        </span>
                        <span className="font-semibold text-white tabular-nums">
                          {formatCurrency(inv.amount, inv.currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gamification & Growth Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Tier Progress - Larger card */}
          <Card
            variant="glass"
            className="lg:col-span-2 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Merchant Tier Progress
              </CardTitle>
              <CardDescription>Unlock better rates as you grow</CardDescription>
            </CardHeader>
            <CardContent>
              <TierProgress
                currentVolume={gamification?.tier?.currentVolume || stats?.totalRevenue?.value || 0}
              />
            </CardContent>
          </Card>

          {/* Fee Savings Calculator */}
          <div
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: "350ms", animationFillMode: "forwards" }}
          >
            <FeeSavingsCard monthlyVolume={stats?.thisMonth?.value || 0} />
          </div>
        </div>

        {/* Referral Widget */}
        <div
          className="opacity-0 animate-fade-in-up"
          style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
        >
          <ReferralWidget />
        </div>

        {/* Quick Actions - Bento Grid Style */}
        <Card
          variant="glass"
          className="opacity-0 animate-fade-in-up"
          style={{ animationDelay: "450ms", animationFillMode: "forwards" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-400" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks to help you get started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  href: "/dashboard/invoices/new",
                  icon: FileText,
                  title: "Create Invoice",
                  description: "Bill your customers",
                  color: "emerald",
                },
                {
                  href: "/dashboard/payments",
                  icon: Link2,
                  title: "Payment Link",
                  description: "Generate shareable link",
                  color: "cyan",
                },
                {
                  href: "/dashboard/receipts",
                  icon: Receipt,
                  title: "View Receipts",
                  description: "Download & share receipts",
                  color: "purple",
                },
                {
                  href: "/dashboard/settings",
                  icon: ExternalLink,
                  title: "Settings",
                  description: "Configure your account",
                  color: "amber",
                },
              ].map((action, index) => (
                <Link key={action.href} href={action.href} className="group">
                  <div
                    className={`flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all duration-300 hover:border-${action.color}-500/50 hover:shadow-lg hover:-translate-y-1 card-hover`}
                    style={{ animationDelay: `${500 + index * 50}ms` }}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${action.color === "emerald"
                          ? "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white"
                          : action.color === "cyan"
                            ? "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white"
                            : action.color === "purple"
                              ? "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white"
                              : "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white"
                        }`}
                    >
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{action.title}</p>
                      <p className="text-sm text-zinc-400">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
