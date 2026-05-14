"use client";

import React from "react";
import { X, FileText, Building2, User, Calendar, Hash, Download } from "lucide-react";
import { Button, Separator } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoicePreviewData {
  number: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  currency: string;
  dueDate: string;
  notes: string;
}

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoicePreviewData;
  lineItems: LineItem[];
  businessName?: string;
}

export function InvoicePreviewModal({
  isOpen,
  onClose,
  invoiceData,
  lineItems,
  businessName = "Your Business",
}: InvoicePreviewModalProps) {
  if (!isOpen) return null;

  const subtotal = lineItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );

  const validLineItems = lineItems.filter(
    (item) => item.description && item.unitPrice > 0
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-lg px-6 py-4 dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/30">
              <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Invoice Preview
              </h2>
              <p className="text-sm text-slate-500">{invoiceData.number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                // TODO: Implement PDF download
                alert("PDF download coming soon!");
              }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-6">
          {/* Invoice Header */}
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Building2 className="h-4 w-4" />
                <span>From</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {businessName}
              </h3>
              <p className="text-sm text-slate-500">Powered by Settla</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Draft
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Bill To & Invoice Details */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <User className="h-4 w-4" />
                <span>Bill To</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="font-medium text-slate-900 dark:text-white">
                  {invoiceData.customerName || "Customer Name"}
                </p>
                {invoiceData.customerEmail && (
                  <p className="text-sm text-slate-500">{invoiceData.customerEmail}</p>
                )}
                {invoiceData.customerAddress && (
                  <p className="mt-2 text-sm text-slate-500 whitespace-pre-line">
                    {invoiceData.customerAddress}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Hash className="h-4 w-4" />
                  <span>Invoice #</span>
                </div>
                <span className="font-mono text-sm text-slate-900 dark:text-white">
                  {invoiceData.number}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Issue Date</span>
                </div>
                <span className="text-sm text-slate-900 dark:text-white">
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {invoiceData.dueDate && (
                <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2 text-amber-600 text-sm dark:text-amber-400">
                    <Calendar className="h-4 w-4" />
                    <span>Due Date</span>
                  </div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {formatDate(invoiceData.dueDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 w-20">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 w-28">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 w-28">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {validLineItems.length > 0 ? (
                  validLineItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className={
                        index !== validLineItems.length - 1
                          ? "border-b border-slate-100 dark:border-slate-800"
                          : ""
                      }
                    >
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                        {formatCurrency(item.unitPrice, invoiceData.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(item.quantity * item.unitPrice, invoiceData.currency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-slate-400"
                    >
                      No line items added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900 dark:text-white">
                  {formatCurrency(subtotal, invoiceData.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Network Fee</span>
                <span className="text-emerald-600">Free</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  Total
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(subtotal, invoiceData.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoiceData.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-500">Notes</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line dark:text-slate-400">
                  {invoiceData.notes}
                </p>
              </div>
            </>
          )}

          {/* Payment Info */}
          <Separator className="my-6" />
          <div className="rounded-lg bg-gradient-to-br from-cyan-50 to-emerald-50 p-4 dark:from-cyan-900/20 dark:to-emerald-900/20">
            <h4 className="mb-2 text-sm font-medium text-cyan-900 dark:text-cyan-300">
              Payment Instructions
            </h4>
            <p className="text-sm text-cyan-700 dark:text-cyan-400">
              This invoice will be payable in <strong>{invoiceData.currency}</strong> via 
              the Sera Protocol. Customer will receive a secure payment link with 
              WalletConnect and Passkey options.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              This is a preview. Invoice will be finalized when sent.
            </p>
            <Button onClick={onClose}>Close Preview</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
