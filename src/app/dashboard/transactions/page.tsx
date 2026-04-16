"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AnimatedCurrency,
  SkeletonList,
  SkeletonStats,
  TransactionDetailSlideout,
} from "@/components/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  RefreshCw,
  ArrowRightLeft,
  List,
  LayoutGrid,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { formatCurrency, formatDateTime, formatAddress, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  payerAddress?: string | null;
  txHash?: string | null;
  seraOrderId?: string | null;
  createdAt: string;
  invoice?: { invoiceNumber: string } | null;
  paymentLink?: { shortCode: string } | null;
}

const statusColors: Record<string, "success" | "warning" | "destructive" | "info" | "default"> = {
  settled: "success",
  confirmed: "info",
  pending: "warning",
  failed: "destructive",
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  settled: CheckCircle2,
  confirmed: CheckCircle2,
  pending: Clock,
  failed: XCircle,
};

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [slideoutOpen, setSlideoutOpen] = useState(false);

  const fetchTransactions = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter((txn) => {
    const description = txn.invoice?.invoiceNumber
      ? `Invoice #${txn.invoice.invoiceNumber}`
      : txn.paymentLink?.shortCode
        ? `Payment Link ${txn.paymentLink.shortCode}`
        : "Direct Transfer";

    const matchesSearch =
      description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (txn.txHash && txn.txHash.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === "all" || txn.type === typeFilter;
    const matchesStatus = statusFilter === "all" || txn.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Group transactions by date for timeline view
  const groupedTransactions = filteredTransactions.reduce((acc, txn) => {
    const date = formatDate(new Date(txn.createdAt));
    if (!acc[date]) acc[date] = [];
    acc[date].push(txn);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const totalInflow = transactions
    .filter((t) => t.type === "inflow" && (t.status === "settled" || t.status === "confirmed"))
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalOutflow = transactions
    .filter((t) => t.type === "outflow" && (t.status === "settled" || t.status === "confirmed"))
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const pendingAmount = transactions
    .filter((t) => t.status === "pending")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Export transactions to CSV
  const handleExport = () => {
    const csvContent = [
      ["Sera Transactions Export"],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Total Transactions: ${filteredTransactions.length}`],
      [],
      ["ID", "Type", "Amount", "Currency", "Status", "Description", "Date", "Transaction Hash"],
      ...filteredTransactions.map((txn) => {
        const description = txn.invoice?.invoiceNumber
          ? `Invoice #${txn.invoice.invoiceNumber}`
          : txn.paymentLink?.shortCode
            ? `Payment Link ${txn.paymentLink.shortCode}`
            : "Direct Transfer";
        return [
          txn.id,
          txn.type,
          Number(txn.amount).toFixed(2),
          txn.currency,
          txn.status,
          `"${description}"`,
          new Date(txn.createdAt).toISOString(),
          txn.txHash || "",
        ];
      }),
    ].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sera-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Transaction item component
  const TransactionItem = ({ txn, index }: { txn: Transaction; index: number }) => {
    const description = txn.invoice?.invoiceNumber
      ? `Invoice #${txn.invoice.invoiceNumber}`
      : txn.paymentLink?.shortCode
        ? `Payment Link ${txn.paymentLink.shortCode}`
        : "Direct Transfer";
    const StatusIcon = statusIcons[txn.status] || AlertCircle;

    const handleClick = () => {
      setSelectedTransaction(txn);
      setSlideoutOpen(true);
    };

    return (
      <div
        onClick={handleClick}
        className="flex items-center justify-between p-5 rounded-xl bg-zinc-800/30 hover:bg-zinc-700/50 transition-all hover:scale-[1.01] group opacity-0 animate-fade-in-up cursor-pointer"
        style={{ animationDelay: `${index * 30}ms`, animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${txn.type === "inflow"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
              }`}
          >
            {txn.type === "inflow" ? (
              <ArrowDownLeft className="h-5 w-5" />
            ) : (
              <ArrowUpRight className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-medium text-white">{description}</p>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>{formatDateTime(new Date(txn.createdAt))}</span>
              {txn.txHash && (
                <>
                  <span>•</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txn.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-emerald-400 transition-colors font-mono"
                  >
                    {formatAddress(txn.txHash, 6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${txn.status === "settled" || txn.status === "confirmed"
                ? "text-emerald-400"
                : txn.status === "pending"
                  ? "text-amber-400"
                  : "text-red-400"
              }`} />
            <Badge variant={statusColors[txn.status] || "default"}>
              {txn.status}
            </Badge>
          </div>
          <div className="text-right min-w-[120px]">
            <p
              className={`text-lg font-semibold tabular-nums ${txn.type === "inflow" ? "text-emerald-400" : "text-red-400"
                }`}
            >
              {txn.type === "inflow" ? "+" : "-"}
              {formatCurrency(Number(txn.amount), txn.currency)}
            </p>
            <p className="text-sm text-zinc-500 font-mono">
              {txn.payerAddress ? formatAddress(txn.payerAddress) : "Unknown"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header title="Transactions" description="Loading your transactions..." />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonStats key={i} />
            ))}
          </div>
          <Card variant="glass">
            <CardContent className="p-6">
              <SkeletonList items={5} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Transactions"
        description="Track all incoming and outgoing payments"
        actions={
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fetchTransactions(true)}
                  disabled={isRefreshing}
                  className="border-zinc-700 h-9 w-9 sm:h-10 sm:w-10"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Button variant="outline" className="gap-2 border-zinc-700 text-sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            {
              title: "Total Inflow",
              value: totalInflow,
              icon: ArrowDownLeft,
              color: "emerald",
              prefix: "+",
            },
            {
              title: "Total Outflow",
              value: totalOutflow,
              icon: ArrowUpRight,
              color: "red",
              prefix: "-",
            },
            {
              title: "Pending",
              value: pendingAmount,
              icon: Clock,
              color: "amber",
              prefix: "",
            },
          ].map((stat, index) => (
            <Card
              key={stat.title}
              variant="glass"
              className="opacity-0 animate-fade-in-up card-hover"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
            >
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <div
                    className={`flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl ${stat.color === "emerald"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : stat.color === "red"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                  >
                    <stat.icon className="h-5 w-5 sm:h-7 sm:w-7" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs sm:text-sm text-zinc-400">{stat.title}</p>
                    <p
                      className={`text-base sm:text-2xl font-bold tabular-nums ${stat.color === "emerald"
                          ? "text-emerald-400"
                          : stat.color === "red"
                            ? "text-red-400"
                            : "text-amber-400"
                        }`}
                    >
                      {stat.prefix}
                      <AnimatedCurrency value={stat.value} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card
          variant="glass"
          className="opacity-0 animate-fade-in-up"
          style={{ animationDelay: "150ms", animationFillMode: "forwards" }}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {/* Search - full width on mobile */}
              <div className="relative w-full">
                <Input
                  placeholder="Search by ID, invoice, or tx hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4 text-zinc-400" />}
                  className="bg-zinc-800/50"
                />
              </div>
              {/* Filters row */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[110px] sm:w-[140px] bg-zinc-800/50 border-zinc-700 text-sm">
                      <ArrowRightLeft className="h-4 w-4 mr-1 sm:mr-2 text-zinc-400" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="inflow">Inflow</SelectItem>
                      <SelectItem value="outflow">Outflow</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[110px] sm:w-[140px] bg-zinc-800/50 border-zinc-700 text-sm">
                      <Filter className="h-4 w-4 mr-1 sm:mr-2 text-zinc-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="settled">Settled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-colors ${viewMode === "list"
                          ? "bg-emerald-500 text-white"
                          : "text-zinc-400 hover:text-white"
                        }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>List view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("timeline")}
                      className={`p-2 rounded-md transition-colors ${viewMode === "timeline"
                          ? "bg-emerald-500 text-white"
                          : "text-zinc-400 hover:text-white"
                        }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Timeline view</TooltipContent>
                </Tooltip>
              </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List/Timeline */}
        <Card
          variant="glass"
          className="opacity-0 animate-fade-in-up"
          style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-emerald-400" />
              {filteredTransactions.length} Transactions
            </CardTitle>
            {filteredTransactions.length > 0 && (
              <p className="text-sm text-zinc-400">
                Net: {totalInflow - totalOutflow >= 0 ? "+" : ""}
                {formatCurrency(totalInflow - totalOutflow, "USDC")}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-20 w-20 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
                  <ArrowRightLeft className="h-10 w-10 text-zinc-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No transactions found</h3>
                <p className="text-zinc-400 text-center max-w-sm">
                  {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters to see more transactions"
                    : "Transactions will appear here when you receive payments"}
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="p-4 space-y-3">
                {filteredTransactions.map((txn, index) => (
                  <TransactionItem key={txn.id} txn={txn} index={index} />
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-8">
                {Object.entries(groupedTransactions).map(([date, txns], groupIndex) => (
                  <div key={date}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{date}</p>
                        <p className="text-sm text-zinc-500">{txns.length} transaction{txns.length > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="ml-5 pl-9 border-l-2 border-zinc-800 space-y-3">
                      {txns.map((txn, index) => (
                        <TransactionItem key={txn.id} txn={txn} index={groupIndex * 10 + index} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Detail Slideout */}
      <TransactionDetailSlideout
        transaction={selectedTransaction ? {
          id: selectedTransaction.id,
          type: selectedTransaction.type as "inflow" | "outflow",
          amount: Number(selectedTransaction.amount),
          currency: selectedTransaction.currency,
          status: selectedTransaction.status as "pending" | "confirmed" | "failed" | "settled",
          txHash: selectedTransaction.txHash || undefined,
          fromAddress: selectedTransaction.payerAddress || undefined,
          createdAt: selectedTransaction.createdAt,
          invoiceId: selectedTransaction.invoice ? undefined : undefined,
          invoiceNumber: selectedTransaction.invoice?.invoiceNumber,
          paymentLinkName: selectedTransaction.paymentLink?.shortCode,
          network: "Ethereum Sepolia",
        } : null}
        isOpen={slideoutOpen}
        onClose={() => setSlideoutOpen(false)}
      />
    </div>
  );
}
