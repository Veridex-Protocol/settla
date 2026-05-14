"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  AnimatedCurrency,
  AnimatedCounter,
  SkeletonStats,
  SkeletonChart,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Link2,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Download,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Info,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  invoicesSent: number;
  invoicesPaid: number;
  linkConversions: number;
  conversionRate: number;
  revenueChange: number;
  expensesChange: number;
}

interface MonthlyData {
  month: string;
  inflow: number;
  outflow: number;
}

interface TopItem {
  name: string;
  value: number;
  secondary: string;
  fullAddress?: string;
}

interface CurrencyBreakdown {
  currency: string;
  amount: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

interface Insight {
  type: "success" | "warning" | "info" | "tip";
  title: string;
  message: string;
  action?: { label: string; href: string };
}

interface AnalyticsResponse {
  metrics: AnalyticsData;
  monthlyData: MonthlyData[];
  topLinks: TopItem[];
  topClients: TopItem[];
  currencyBreakdown: CurrencyBreakdown[];
  period: {
    start: string;
    end: string;
    range: string;
  };
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topLinks, setTopLinks] = useState<TopItem[]>([]);
  const [topClients, setTopClients] = useState<TopItem[]>([]);
  const [currencyBreakdown, setCurrencyBreakdown] = useState<CurrencyBreakdown[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch both analytics and insights in parallel
      const [analyticsRes, insightsRes] = await Promise.all([
        fetch(`/api/analytics?range=${timeRange}`),
        fetch("/api/analytics/insights"),
      ]);

      if (!analyticsRes.ok) {
        throw new Error("Failed to fetch analytics data");
      }

      const data: AnalyticsResponse = await analyticsRes.json();

      setAnalytics(data.metrics);
      setMonthlyData(data.monthlyData);
      setTopLinks(data.topLinks);
      setTopClients(data.topClients);
      setCurrencyBreakdown(data.currencyBreakdown);

      // Parse insights (don't fail if insights fail)
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(insightsData.insights || []);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const handleExport = () => {
    if (!analytics) return;

    // Create CSV content
    const csvContent = [
      ["Sera Analytics Report"],
      [`Period: ${timeRange === "7d" ? "Last 7 Days" : timeRange === "30d" ? "Last 30 Days" : timeRange === "90d" ? "Last 90 Days" : "Last Year"}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ["Key Metrics"],
      ["Metric", "Value", "Change"],
      ["Total Revenue", `$${analytics.totalRevenue.toLocaleString()}`, `${analytics.revenueChange >= 0 ? "+" : ""}${analytics.revenueChange}%`],
      ["Total Expenses", `$${analytics.totalExpenses.toLocaleString()}`, `${analytics.expensesChange >= 0 ? "+" : ""}${analytics.expensesChange}%`],
      ["Invoices Sent", analytics.invoicesSent.toString(), ""],
      ["Invoices Paid", analytics.invoicesPaid.toString(), ""],
      ["Link Conversions", analytics.linkConversions.toString(), ""],
      ["Conversion Rate", `${analytics.conversionRate}%`, ""],
      [],
      ["Monthly Revenue & Expenses"],
      ["Month", "Inflow", "Outflow"],
      ...monthlyData.map(d => [d.month, `$${d.inflow.toLocaleString()}`, `$${d.outflow.toLocaleString()}`]),
      [],
      ["Top Payment Links"],
      ["Name", "Revenue", "Uses"],
      ...topLinks.map(l => [l.name, `$${l.value.toLocaleString()}`, l.secondary]),
      [],
      ["Top Clients"],
      ["Address", "Volume", "Transactions"],
      ...topClients.map(c => [c.name, `$${c.value.toLocaleString()}`, c.secondary]),
      [],
      ["Currency Breakdown"],
      ["Currency", "Amount", "Percentage"],
      ...currencyBreakdown.map(c => [c.currency, `$${c.amount.toLocaleString()}`, `${c.percentage}%`]),
    ].map(row => row.join(",")).join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sera-analytics-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Custom tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="font-medium text-white mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className={entry.dataKey === "inflow" ? "text-emerald-400" : "text-red-400"}>
              {entry.dataKey === "inflow" ? "Inflow" : "Outflow"}: ${entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Handle empty states
  const hasData = analytics && (
    analytics.totalRevenue > 0 ||
    analytics.invoicesSent > 0 ||
    analytics.linkConversions > 0
  );

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="Analytics" description="Loading your business insights..." />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonStats key={i} />
            ))}
          </div>
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col">
        <Header title="Analytics" description="Track your business performance" />
        <div className="p-6">
          <Card variant="glass" className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to load analytics</h3>
            <p className="text-zinc-400 mb-4">{error}</p>
            <Button onClick={() => fetchAnalytics()} className="bg-emerald-600 hover:bg-emerald-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Analytics"
        description="Track your business performance and growth"
        actions={
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-zinc-700"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              className="gap-2 border-zinc-700"
              onClick={handleExport}
              disabled={!analytics}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-zinc-400" />
            <span className="text-sm text-zinc-400">Time period</span>
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            {(["7d", "30d", "90d", "1y"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${timeRange === range
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                  }`}
              >
                {range === "7d"
                  ? "7 Days"
                  : range === "30d"
                    ? "30 Days"
                    : range === "90d"
                      ? "90 Days"
                      : "1 Year"}
              </button>
            ))}
          </div>
        </div>

        {/* Business Insights */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "50ms", animationFillMode: "forwards" }}>
            {insights.slice(0, 4).map((insight, index) => {
              const iconMap = {
                success: CheckCircle2,
                warning: AlertTriangle,
                info: Info,
                tip: Lightbulb,
              };
              const colorMap = {
                success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                tip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
              };
              const Icon = iconMap[insight.type];

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${colorMap[insight.type]} flex items-start gap-3`}
                >
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{insight.title}</p>
                    <p className="text-xs text-zinc-400 mt-1">{insight.message}</p>
                    {insight.action && (
                      <a
                        href={insight.action.href}
                        className="text-xs font-medium mt-2 inline-block hover:underline"
                      >
                        {insight.action.label} →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Total Revenue",
              value: analytics?.totalRevenue || 0,
              change: analytics?.revenueChange || 0,
              icon: DollarSign,
              color: "emerald",
              isCurrency: true,
            },
            {
              title: "Total Expenses",
              value: analytics?.totalExpenses || 0,
              change: -(analytics?.expensesChange || 0),
              icon: ArrowDownRight,
              color: "red",
              isCurrency: true,
            },
            {
              title: "Invoices Sent",
              value: analytics?.invoicesSent || 0,
              secondary: `${analytics?.invoicesPaid || 0} paid (${Math.round(((analytics?.invoicesPaid || 0) / (analytics?.invoicesSent || 1)) * 100)}%)`,
              icon: FileText,
              color: "blue",
            },
            {
              title: "Link Conversions",
              value: analytics?.linkConversions || 0,
              secondary: `${analytics?.conversionRate || 0}% conversion rate`,
              icon: Link2,
              color: "purple",
            },
          ].map((metric, index) => (
            <Card
              key={metric.title}
              variant="glass"
              className="opacity-0 animate-fade-in-up card-hover relative overflow-hidden group"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
            >
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${metric.color === "emerald"
                  ? "from-emerald-500/5 to-transparent"
                  : metric.color === "red"
                    ? "from-red-500/5 to-transparent"
                    : metric.color === "blue"
                      ? "from-blue-500/5 to-transparent"
                      : "from-emerald-500/5 to-transparent"
                  }`}
              />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-zinc-400">{metric.title}</span>
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${metric.color === "emerald"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : metric.color === "red"
                        ? "bg-red-500/10 text-red-400"
                        : metric.color === "blue"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                  >
                    <metric.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums mb-1">
                  {metric.isCurrency ? (
                    <AnimatedCurrency value={metric.value} />
                  ) : (
                    <AnimatedCounter value={metric.value} />
                  )}
                </p>
                {metric.change !== undefined && (
                  <p
                    className={`text-sm flex items-center gap-1 ${metric.change >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                  >
                    {metric.change >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change).toFixed(1)}% vs last period
                  </p>
                )}
                {metric.secondary && (
                  <p className="text-sm text-zinc-400">{metric.secondary}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        <Card
          variant="glass"
          className="opacity-0 animate-fade-in-up"
          style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
                Revenue & Expenses
              </CardTitle>
              <CardDescription>Monthly breakdown of cash flow</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 || monthlyData.every(d => d.inflow === 0 && d.outflow === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <BarChart3 className="h-12 w-12 text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-sm">No transaction data for this period</p>
                <p className="text-zinc-500 text-xs mt-1">Transactions will appear here as they occur</p>
              </div>
            ) : (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={monthlyData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#a1a1aa', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#a1a1aa', fontSize: 12 }}
                        tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                      />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Bar
                        dataKey="inflow"
                        fill="url(#inflowGradient)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                      />
                      <Bar
                        dataKey="outflow"
                        fill="url(#outflowGradient)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                      />
                      <defs>
                        <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                    <span className="text-sm text-zinc-400">Inflow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-400" />
                    <span className="text-sm text-zinc-400">Outflow</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Payment Links */}
          <Card
            variant="glass"
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-emerald-400" />
                Top Payment Links
              </CardTitle>
              <CardDescription>Most used payment links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topLinks.length === 0 ? (
                <div className="text-center py-8">
                  <Link2 className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">No payment links used yet</p>
                  <p className="text-zinc-500 text-xs mt-1">Create payment links to start tracking</p>
                </div>
              ) : (
                topLinks.map((link, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 transition-all hover:scale-[1.02] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                        <Link2 className="h-5 w-5 text-emerald-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{link.name}</p>
                        <p className="text-xs text-zinc-400">{link.secondary}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-white tabular-nums">
                      ${link.value.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card
            variant="glass"
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: "350ms", animationFillMode: "forwards" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                Top Clients
              </CardTitle>
              <CardDescription>By transaction volume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topClients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">No client transactions yet</p>
                  <p className="text-zinc-500 text-xs mt-1">Receive payments to see your top clients</p>
                </div>
              ) : (
                topClients.map((client, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 transition-all hover:scale-[1.02] group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-lg font-bold text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                            #{i + 1}
                          </div>
                          <div>
                            <p className="font-mono text-white">{client.name}</p>
                            <p className="text-xs text-zinc-400">{client.secondary}</p>
                          </div>
                        </div>
                        <span className="font-semibold text-white tabular-nums">
                          ${client.value.toLocaleString()}
                        </span>
                      </div>
                    </TooltipTrigger>
                    {client.fullAddress && (
                      <TooltipContent>
                        <p className="font-mono text-xs">{client.fullAddress}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Currency Distribution */}
        <Card
          variant="glass"
          className="opacity-0 animate-fade-in-up"
          style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-emerald-400" />
              Currency Distribution
            </CardTitle>
            <CardDescription>Breakdown by stablecoin</CardDescription>
          </CardHeader>
          <CardContent>
            {currencyBreakdown.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <PieChart className="h-12 w-12 text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-sm">No currency data for this period</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <RechartsPieChart>
                      <Pie
                        data={currencyBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="amount"
                        nameKey="currency"
                      >
                        {currencyBreakdown.map((entry, index) => {
                          const colors = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
                                <p className="font-medium text-white">{data.currency}</p>
                                <p className="text-zinc-400">${data.amount.toLocaleString()}</p>
                                <p className="text-zinc-500 text-sm">{data.percentage}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                {/* Currency Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {currencyBreakdown.map((item, index) => {
                    const colors = ["bg-emerald-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-pink-500"];
                    return (
                      <div
                        key={item.currency}
                        className="p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 transition-all hover:scale-[1.02] group opacity-0 animate-fade-in-up"
                        style={{ animationDelay: `${450 + index * 50}ms`, animationFillMode: "forwards" }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                          <span className="font-medium text-white text-sm">{item.currency}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300 ml-auto">
                            {item.percentage}%
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-white tabular-nums">
                          <AnimatedCurrency value={item.amount} />
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
