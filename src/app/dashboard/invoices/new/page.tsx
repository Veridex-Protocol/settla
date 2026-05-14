"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Textarea,
  Separator,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
} from "@/components/ui";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CalendarDays,
  DollarSign,
  FileText,
  Send,
  Save,
  Eye,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { generateInvoiceNumber, SUPPORTED_CURRENCIES, formatCurrency } from "@/lib/utils";
import { InvoicePreviewModal } from "@/components/invoices/invoice-preview-modal";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
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

  const [invoiceData, setInvoiceData] = useState({
    number: generateInvoiceNumber(),
    customerName: "",
    customerEmail: "",
    customerAddress: "",
    currency: "USDC",
    dueDate: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0 },
  ]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const subtotal = lineItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );

  const handleSave = async (send: boolean = false) => {
    if (!invoiceData.customerName) {
      setAlertDialog({
        isOpen: true,
        title: "Missing Information",
        description: "Customer name is required to create an invoice.",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-requested-with": "fetch",
        },
        body: JSON.stringify({
          customerName: invoiceData.customerName,
          customerEmail: invoiceData.customerEmail,
          amount: subtotal,
          currency: invoiceData.currency,
          dueDate: invoiceData.dueDate || undefined,
          items: lineItems,
          notes: invoiceData.notes,
        }),
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg);
      }

      router.push("/dashboard/invoices");
      router.refresh();
    } catch (error) {
      console.error("Failed to create invoice", error);
      setAlertDialog({
        isOpen: true,
        title: "Creation Failed",
        description: "Failed to create invoice. Please try again.",
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Create Invoice"
        description="Create a professional invoice for your customer"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={isSubmitting} loading={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <div className="mb-6">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Invoice Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Customer Details</CardTitle>
                <CardDescription>Who is this invoice for?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      placeholder="Acme Corporation"
                      value={invoiceData.customerName}
                      onChange={(e) =>
                        setInvoiceData({ ...invoiceData, customerName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Email Address *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="billing@acme.com"
                      value={invoiceData.customerEmail}
                      onChange={(e) =>
                        setInvoiceData({ ...invoiceData, customerEmail: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerAddress">Billing Address</Label>
                  <Textarea
                    id="customerAddress"
                    placeholder="123 Business St, Suite 100&#10;San Francisco, CA 94102"
                    value={invoiceData.customerAddress}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, customerAddress: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
                <CardDescription>Configure invoice settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceData.number}
                      onChange={(e) =>
                        setInvoiceData({ ...invoiceData, number: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={invoiceData.currency}
                      onValueChange={(value) =>
                        setInvoiceData({ ...invoiceData, currency: value })
                      }
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.symbol} value={currency.symbol}>
                            {currency.symbol} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) =>
                        setInvoiceData({ ...invoiceData, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Line Items</CardTitle>
                  <CardDescription>Add products or services</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Product or service description"
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, "description", e.target.value)
                        }
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, "quantity", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="w-36 space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Amount</Label>
                      <div className="h-11 flex items-center px-4 rounded-xl bg-slate-100 text-slate-900 font-medium dark:bg-slate-800 dark:text-white">
                        {formatCurrency(item.quantity * item.unitPrice, invoiceData.currency)}
                      </div>
                    </div>
                    <div className="pt-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Notes & Terms</CardTitle>
                <CardDescription>Additional information for the customer</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Payment terms, thank you message, or any additional notes..."
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Invoice Summary */}
          <div className="space-y-6">
            <Card variant="gradient" className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-100 to-cyan-100 dark:from-emerald-900/30 dark:to-cyan-900/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/30">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Invoice Number</p>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {invoiceData.number}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
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
                    <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(subtotal, invoiceData.currency)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button variant="outline" className="w-full gap-2" onClick={() => setShowPreview(true)}>
                    <Eye className="h-4 w-4" />
                    Preview Invoice
                  </Button>
                  <Button className="w-full gap-2" onClick={() => handleSave(true)} loading={isSubmitting}>
                    <Send className="h-4 w-4" />
                    Send to Customer
                  </Button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Powered by Settla Protocol • Instant settlement
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        invoiceData={invoiceData}
        lineItems={lineItems}
      />

      {/* Alert Dialog for notifications */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        description={alertDialog.description}
        variant={alertDialog.variant}
        icon={<AlertCircle className="h-6 w-6" />}
      />
    </div>
  );
}
