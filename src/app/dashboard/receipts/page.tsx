"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
} from "@/components/ui";
import {
  Search,
  Download,
  Mail,
  Eye,
  CheckCircle2,
  Receipt as ReceiptIcon,
  Loader2,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";

interface Receipt {
  id: string;
  receiptNumber: string;
  transactionId: string;
  invoiceNumber?: string | null;
  customer: {
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  txHash?: string | null;
  paymentMethod: string;
  paidAt: string;
  createdAt: string;
  emailSent: boolean;
  pdfUrl?: string | null;
}

export default function ReceiptsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: string }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  
  // Alert dialog state
  const [alertDialog, setAlertDialog] = useState<{ 
    isOpen: boolean; 
    title: string; 
    description: string; 
    variant: "success" | "danger" | "warning" | "info" 
  }>({ 
    isOpen: false, 
    title: "", 
    description: "", 
    variant: "info" 
  });

  useEffect(() => {
    async function fetchReceipts() {
      try {
        const res = await fetch("/api/receipts");
        if (res.ok) {
          const data = await res.json();
          setReceipts(data);
        }
      } catch (error) {
        console.error("Failed to fetch receipts", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReceipts();
  }, []);

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch =
      receipt.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.customer.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Date filtering
    if (dateFilter !== "all") {
      const receiptDate = new Date(receipt.paidAt);
      const now = new Date();

      if (dateFilter === "today") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (receiptDate < today) return false;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (receiptDate < weekAgo) return false;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (receiptDate < monthAgo) return false;
      }
    }

    return matchesSearch;
  });

  const handleView = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setViewModalOpen(true);
  };

  const handleDownload = async (receipt: Receipt) => {
    setActionLoading(prev => ({ ...prev, [receipt.id]: 'download' }));
    try {
      const res = await fetch(`/api/receipts/${receipt.id}/download`, {
        method: 'POST',
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${receipt.receiptNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        setAlertDialog({
          isOpen: true,
          title: "Download Failed",
          description: data.error || 'Failed to download receipt. Please try again.',
          variant: "danger",
        });
      }
    } catch (error) {
      console.error('Failed to download receipt:', error);
      setAlertDialog({
        isOpen: true,
        title: "Download Error",
        description: 'Failed to download receipt. Please try again.',
        variant: "danger",
      });
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[receipt.id];
        return newState;
      });
    }
  };

  const handleSendEmail = async (receipt: Receipt) => {
    if (!receipt.customer.email) {
      setAlertDialog({
        isOpen: true,
        title: "Email Required",
        description: "Customer email is required to send the receipt.",
        variant: "warning",
      });
      return;
    }

    setActionLoading(prev => ({ ...prev, [receipt.id]: 'send' }));
    try {
      const res = await fetch(`/api/receipts/${receipt.id}/send`, {
        method: 'POST',
      });

      if (res.ok) {
        // Update the receipt locally
        setReceipts(prev => prev.map(r =>
          r.id === receipt.id ? { ...r, emailSent: true } : r
        ));
        setAlertDialog({
          isOpen: true,
          title: "Receipt Sent!",
          description: `Receipt has been sent to ${receipt.customer.email}`,
          variant: "success",
        });
      } else {
        const data = await res.json();
        setAlertDialog({
          isOpen: true,
          title: "Send Failed",
          description: data.error || 'Failed to send receipt. Please try again.',
          variant: "danger",
        });
      }
    } catch (error) {
      console.error('Failed to send receipt:', error);
      setAlertDialog({
        isOpen: true,
        title: "Send Error",
        description: 'Failed to send receipt. Please try again.',
        variant: "danger",
      });
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[receipt.id];
        return newState;
      });
    }
  };

  const handleCopyTxHash = async (receipt: Receipt) => {
    if (!receipt.txHash) return;

    try {
      await navigator.clipboard.writeText(receipt.txHash);
      setCopiedId(receipt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = receipt.txHash;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(receipt.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="flex flex-col mb-10">
      <Header
        title="Receipts"
        description="View and manage payment receipts"
        actions={
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card variant="glass">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="Search receipts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="h-4 w-4" />}
                  />
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipts Table */}
        <Card variant="glass">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-zinc-500">Loading receipts...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Receipt
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Payment Method
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Email Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-400">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.map((receipt) => (
                      <tr
                        key={receipt.id}
                        className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                              <ReceiptIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {receipt.receiptNumber}
                              </p>
                              {receipt.invoiceNumber && (
                                <p className="text-sm text-zinc-500">
                                  {receipt.invoiceNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">
                            {receipt.customer.name}
                          </p>
                          <p className="text-sm text-zinc-500">{receipt.customer.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-emerald-400">
                            {formatCurrency(receipt.amount, receipt.currency)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={receipt.paymentMethod === "Passkey" ? "violet" : "info"}>
                            {receipt.paymentMethod}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {receipt.emailSent ? (
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm">Sent</span>
                            </div>
                          ) : (
                            <Badge variant="warning" dot>
                              Not sent
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-zinc-300">
                            {formatDate(receipt.paidAt)}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {formatDateTime(receipt.paidAt).split(",")[1] || ''}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View Receipt"
                              onClick={() => handleView(receipt)}
                            >
                              <Eye className="h-4 w-4 text-zinc-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Download PDF"
                              onClick={() => handleDownload(receipt)}
                              disabled={actionLoading[receipt.id] === 'download'}
                            >
                              {actionLoading[receipt.id] === 'download' ? (
                                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                              ) : (
                                <Download className="h-4 w-4 text-zinc-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={receipt.emailSent ? "Resend Email" : "Send Email"}
                              onClick={() => handleSendEmail(receipt)}
                              disabled={actionLoading[receipt.id] === 'send'}
                            >
                              {actionLoading[receipt.id] === 'send' ? (
                                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                              ) : (
                                <Mail className="h-4 w-4 text-zinc-400" />
                              )}
                            </Button>
                            {receipt.txHash && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={copiedId === receipt.id ? "Copied!" : "Copy Tx Hash"}
                                onClick={() => handleCopyTxHash(receipt)}
                              >
                                {copiedId === receipt.id ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4 text-zinc-400" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredReceipts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500">
                  <ReceiptIcon className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  No receipts found
                </h3>
                <p className="mt-2 text-zinc-500">
                  {searchQuery || dateFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Receipts are automatically generated when payments are completed"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Modal */}
      {viewModalOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <ReceiptIcon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Receipt Details
                  </h2>
                  <p className="text-sm text-zinc-500">{selectedReceipt.receiptNumber}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewModalOpen(false)}>
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Customer</p>
                  <p className="font-medium text-white">{selectedReceipt.customer.name}</p>
                  <p className="text-sm text-zinc-500">{selectedReceipt.customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Amount</p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {formatCurrency(selectedReceipt.amount, selectedReceipt.currency)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Date</p>
                  <p className="font-medium text-white">
                    {formatDateTime(selectedReceipt.paidAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Payment Method</p>
                  <Badge variant={selectedReceipt.paymentMethod === "Passkey" ? "violet" : "info"}>
                    {selectedReceipt.paymentMethod}
                  </Badge>
                </div>
              </div>

              {selectedReceipt.txHash && (
                <div>
                  <p className="text-sm text-zinc-500">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-300 border border-zinc-700">
                      {selectedReceipt.txHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyTxHash(selectedReceipt)}
                    >
                      {copiedId === selectedReceipt.id ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-zinc-400" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {selectedReceipt.invoiceNumber && (
                <div>
                  <p className="text-sm text-zinc-500">Related Invoice</p>
                  <p className="font-medium text-white">
                    {selectedReceipt.invoiceNumber}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1 gap-2"
                onClick={() => handleDownload(selectedReceipt)}
                disabled={actionLoading[selectedReceipt.id] === 'download'}
              >
                {actionLoading[selectedReceipt.id] === 'download' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => handleSendEmail(selectedReceipt)}
                disabled={actionLoading[selectedReceipt.id] === 'send' || !selectedReceipt.customer.email}
              >
                {actionLoading[selectedReceipt.id] === 'send' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {selectedReceipt.emailSent ? 'Resend' : 'Send'} Email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog for notifications */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        description={alertDialog.description}
        variant={alertDialog.variant}
        icon={
          alertDialog.variant === "success" ? <CheckCircle2 className="h-6 w-6" /> :
          alertDialog.variant === "danger" ? <AlertCircle className="h-6 w-6" /> :
          alertDialog.variant === "warning" ? <AlertCircle className="h-6 w-6" /> :
          <Mail className="h-6 w-6" />
        }
      />
    </div>
  );
}
