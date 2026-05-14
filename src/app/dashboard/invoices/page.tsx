"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  ConfirmDialog,
  AlertDialog,
} from "@/components/ui";
import {
  Plus,
  Search,
  Eye,
  Send,
  Copy,
  Download,
  FileText,
  Loader2,
  Check,
  Trash2,
  Mail,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceViewModal } from "@/components/invoices/invoice-view-modal";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string | null;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  dueDate?: string | null;
  items?: Array<{ description: string; quantity?: number; amount?: number }>;
  notes?: string | null;
}

const statusColors: Record<string, "success" | "warning" | "destructive" | "info" | "default"> = {
  settled: "success",
  paid: "success",
  sent: "info",
  pending: "warning",
  overdue: "destructive",
  draft: "default",
  cancelled: "destructive",
};

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: string }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; invoice: Invoice | null }>({ isOpen: false, invoice: null });
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; description: string; variant: "success" | "danger" | "warning" | "info" }>({ 
    isOpen: false, 
    title: "", 
    description: "", 
    variant: "info" 
  });

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/invoices");
        if (res.ok) {
          const data = await res.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error("Failed to fetch invoices", error);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customerEmail && inv.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid" || i.status === "settled").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  // Action handlers
  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewModalOpen(true);
  };

  const handleSend = async (invoice: Invoice) => {
    if (!invoice.customerEmail) {
      setAlertDialog({
        isOpen: true,
        title: "Email Required",
        description: "Customer email is required to send the invoice. Please add a customer email first.",
        variant: "warning",
      });
      return;
    }
    
    setActionLoading(prev => ({ ...prev, [invoice.id]: 'send' }));
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      });
      
      if (res.ok) {
        // Update the invoice status locally
        setInvoices(prev => prev.map(inv => 
          inv.id === invoice.id ? { ...inv, status: 'sent' } : inv
        ));
        setAlertDialog({
          isOpen: true,
          title: "Invoice Sent!",
          description: `Invoice ${invoice.invoiceNumber} has been sent to ${invoice.customerEmail}`,
          variant: "success",
        });
      } else {
        const data = await res.json();
        setAlertDialog({
          isOpen: true,
          title: "Failed to Send",
          description: data.error || 'Failed to send invoice. Please try again.',
          variant: "danger",
        });
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
      setAlertDialog({
        isOpen: true,
        title: "Error",
        description: 'Failed to send invoice. Please try again.',
        variant: "danger",
      });
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[invoice.id];
        return newState;
      });
    }
  };

  const handleCopyLink = async (invoice: Invoice) => {
    // Generate a payment link URL using the configured app URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const paymentUrl = `${baseUrl}/pay/${invoice.invoiceNumber}`;
    
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopiedId(invoice.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = paymentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(invoice.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    setActionLoading(prev => ({ ...prev, [invoice.id]: 'download' }));
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/download`, {
        method: 'POST',
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        setAlertDialog({
          isOpen: true,
          title: "Download Failed",
          description: data.error || 'Failed to download invoice. Please try again.',
          variant: "danger",
        });
      }
    } catch (error) {
      console.error('Failed to download invoice:', error);
      setAlertDialog({
        isOpen: true,
        title: "Download Error",
        description: 'Failed to download invoice. Please try again.',
        variant: "danger",
      });
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[invoice.id];
        return newState;
      });
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (invoice: Invoice) => {
    setDeleteDialog({ isOpen: true, invoice });
  };

  // Execute delete after confirmation
  const executeDelete = async () => {
    const invoice = deleteDialog.invoice;
    if (!invoice) return;
    
    setDeleteDialog({ isOpen: false, invoice: null });
    setActionLoading(prev => ({ ...prev, [invoice.id]: 'delete' }));
    
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        // Remove the invoice from local state
        setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        setAlertDialog({
          isOpen: true,
          title: "Invoice Deleted",
          description: `Invoice ${invoice.invoiceNumber} has been permanently deleted.`,
          variant: "success",
        });
      } else {
        const data = await res.json();
        setAlertDialog({
          isOpen: true,
          title: "Delete Failed",
          description: data.error || 'Failed to delete invoice. Please try again.',
          variant: "danger",
        });
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      setAlertDialog({
        isOpen: true,
        title: "Delete Error",
        description: 'Failed to delete invoice. Please try again.',
        variant: "danger",
      });
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[invoice.id];
        return newState;
      });
    }
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Invoices"
        description="Create and manage invoices for your customers"
        actions={
          <Link href="/dashboard/invoices/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Filters and Search */}
        <Card variant="glass">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="h-4 w-4" />}
                  />
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status ({statusCounts.all})</SelectItem>
                      <SelectItem value="draft">Draft ({statusCounts.draft})</SelectItem>
                      <SelectItem value="sent">Sent ({statusCounts.sent})</SelectItem>
                      <SelectItem value="paid">Paid ({statusCounts.paid})</SelectItem>
                      <SelectItem value="overdue">Overdue ({statusCounts.overdue})</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card variant="glass">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading invoices...</div>
            ) : (
              <>
                {/* Mobile scroll hint */}
                <div className="sm:hidden px-4 py-2 text-xs text-zinc-500 flex items-center gap-1 border-b border-zinc-800">
                  <span>←</span> Scroll to see more <span>→</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Invoice
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Customer
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Due Date
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-600 dark:from-emerald-900/30 dark:to-cyan-900/30 dark:text-emerald-400">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {inv.invoiceNumber}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {formatDate(inv.createdAt)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {inv.customerName}
                            </p>
                            <p className="text-sm text-slate-500">{inv.customerEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(Number(inv.amount), inv.currency)}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={statusColors[inv.status] || "default"} dot>
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-600 dark:text-slate-300">
                              {inv.dueDate ? formatDate(inv.dueDate) : '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="View"
                                onClick={() => handleView(inv)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(inv.status === "draft" || inv.status === "sent") && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Send"
                                  onClick={() => handleSend(inv)}
                                  disabled={actionLoading[inv.id] === 'send'}
                                >
                                  {actionLoading[inv.id] === 'send' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title={copiedId === inv.id ? "Copied!" : "Copy Link"}
                                onClick={() => handleCopyLink(inv)}
                              >
                                {copiedId === inv.id ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Download PDF"
                                onClick={() => handleDownload(inv)}
                                disabled={actionLoading[inv.id] === 'download'}
                              >
                                {actionLoading[inv.id] === 'download' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Delete Invoice"
                                onClick={() => openDeleteDialog(inv)}
                                disabled={actionLoading[inv.id] === 'delete'}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                {actionLoading[inv.id] === 'delete' ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredInvoices.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                      No invoices found
                    </h3>
                    <p className="mt-2 text-slate-500">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filter"
                        : "Get started by creating your first invoice"}
                    </p>
                    {!searchQuery && statusFilter === "all" && (
                      <Link href="/dashboard/invoices/new" className="mt-4">
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Create Invoice
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice View Modal */}
      {selectedInvoice && (
        <InvoiceViewModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          onSend={() => handleSend(selectedInvoice)}
          onDownload={() => handleDownload(selectedInvoice)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, invoice: null })}
        onConfirm={executeDelete}
        title="Delete Invoice"
        description={deleteDialog.invoice 
          ? `Are you sure you want to delete invoice ${deleteDialog.invoice.invoiceNumber}? This action cannot be undone and will also remove the associated payment link.`
          : "Are you sure you want to delete this invoice?"
        }
        confirmText="Delete Invoice"
        cancelText="Keep Invoice"
        variant="danger"
        icon={<Trash2 className="h-6 w-6" />}
      />

      {/* Alert Dialog for notifications */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        description={alertDialog.description}
        variant={alertDialog.variant}
        icon={
          alertDialog.variant === "success" ? <Check className="h-6 w-6" /> :
          alertDialog.variant === "danger" ? <AlertCircle className="h-6 w-6" /> :
          alertDialog.variant === "warning" ? <AlertCircle className="h-6 w-6" /> :
          <Mail className="h-6 w-6" />
        }
      />
    </div>
  );
}
