"use client";

import React from "react";
import { X, FileText, Building2, User, Calendar, Hash, Download, Send, ExternalLink } from "lucide-react";
import { Button, Badge, Separator } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

interface LineItem {
  description: string;
  quantity?: number;
  amount?: number;
  unitPrice?: number;
}

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
  items?: LineItem[];
  notes?: string | null;
}

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSend?: () => void;
  onDownload?: () => void;
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

export function InvoiceViewModal({
  isOpen,
  onClose,
  invoice,
  onSend,
  onDownload,
}: InvoiceViewModalProps) {
  if (!isOpen) return null;

  const items = invoice.items || [];
  const subtotal = items.reduce(
    (acc, item) => acc + (item.quantity || 1) * (item.unitPrice || item.amount || 0),
    0
  );
  const total = Number(invoice.amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-lg px-6 py-4 dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Invoice Details
              </h2>
              <p className="text-sm text-slate-500">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(invoice.status === "draft" || invoice.status === "sent") && onSend && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onSend}
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            )}
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onDownload}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-6 space-y-6">
          {/* Status and Dates */}
          <div className="flex items-center justify-between">
            <Badge variant={statusColors[invoice.status] || "default"} dot className="text-sm">
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
            <div className="text-right text-sm text-slate-500">
              <p>Created: {formatDate(invoice.createdAt)}</p>
              {invoice.dueDate && <p>Due: {formatDate(invoice.dueDate)}</p>}
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <User className="h-4 w-4" />
                <span>Customer</span>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">{invoice.customerName}</p>
              {invoice.customerEmail && (
                <p className="text-sm text-slate-500">{invoice.customerEmail}</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <Hash className="h-4 w-4" />
                <span>Invoice Number</span>
              </div>
              <p className="font-medium text-slate-900 dark:text-white">{invoice.invoiceNumber}</p>
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3">Items</h3>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={index} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                          {item.description || 'Item'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 text-right">
                          {item.quantity || 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 text-right">
                          {formatCurrency(item.unitPrice || item.amount || 0, invoice.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white text-right">
                          {formatCurrency((item.quantity || 1) * (item.unitPrice || item.amount || 0), invoice.currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                        Invoice Amount
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 text-right">
                        1
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 text-right">
                        {formatCurrency(total, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white text-right">
                        {formatCurrency(total, invoice.currency)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              {items.length > 0 && subtotal !== total && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-900 dark:text-white">
                    {formatCurrency(subtotal, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-medium text-slate-900 dark:text-white">Total</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Notes</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
