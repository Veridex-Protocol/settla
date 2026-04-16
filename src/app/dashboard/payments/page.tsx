"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
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
  Copy,
  ExternalLink,
  QrCode,
  Trash2,
  Link2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Ban,
  Power,
} from "lucide-react";
import { formatCurrency, formatDate, SUPPORTED_CURRENCIES } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface PaymentLink {
  id: string;
  shortCode: string;
  amount: number;
  currency: string;
  status: string;
  uses: number;
  usedCount: number;
  maxUses: number | null;
  createdAt: string;
  expiresAt: string | null;
}

const statusColors: Record<string, "success" | "warning" | "destructive" | "info" | "default"> = {
  active: "success",
  completed: "info",
  used: "info", // Payment link used up all its allowed uses
  expired: "destructive",
  disabled: "warning",
  cancelled: "default",
};

export default function PaymentLinksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PaymentLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; linkId: string | null; shortCode: string }>({ 
    isOpen: false, 
    linkId: null, 
    shortCode: "" 
  });
  const [disableDialog, setDisableDialog] = useState<{ isOpen: boolean; link: PaymentLink | null; action: 'disable' | 'enable' }>({ 
    isOpen: false, 
    link: null, 
    action: 'disable'
  });
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

  const [newLink, setNewLink] = useState({
    amount: "",
    currency: "USDC",
    maxUses: "",
    expiresIn: "",
  });

  // Fetch payment links on mount
  useEffect(() => {
    fetchPaymentLinks();
  }, []);

  const fetchPaymentLinks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payment-links');
      if (!response.ok) {
        throw new Error('Failed to fetch payment links');
      }
      const data = await response.json();
      setPaymentLinks(data.paymentLinks || []);
    } catch (err) {
      console.error('Error fetching payment links:', err);
      setError('Failed to load payment links');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLinks = paymentLinks.filter(
    (link) =>
      link.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPaymentUrl = (shortCode: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${baseUrl}/pay/${shortCode}`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLink = async () => {
    if (!newLink.amount) {
      setError('Amount is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create payment link');
      }

      // Refresh the list
      await fetchPaymentLinks();
      setCreateDialogOpen(false);
      setNewLink({ amount: "", currency: "USDC", maxUses: "", expiresIn: "" });
      setAlertDialog({
        isOpen: true,
        title: "Payment Link Created",
        description: "Your payment link has been created successfully.",
        variant: "success",
      });
    } catch (err: any) {
      console.error('Error creating payment link:', err);
      setAlertDialog({
        isOpen: true,
        title: "Creation Failed",
        description: err.message || 'Failed to create payment link. Please try again.',
        variant: "danger",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (link: PaymentLink) => {
    // Check if the link has been used - if so, show disable option instead
    const hasBeenUsed = link.uses > 0 || link.usedCount > 0;
    if (hasBeenUsed) {
      setAlertDialog({
        isOpen: true,
        title: "Cannot Delete Used Link",
        description: "This payment link has already been used. You can disable it instead to prevent further payments.",
        variant: "warning",
      });
      return;
    }
    setDeleteDialog({ isOpen: true, linkId: link.id, shortCode: link.shortCode });
  };

  // Open disable/enable confirmation dialog
  const openDisableDialog = (link: PaymentLink) => {
    const action = link.status === 'disabled' ? 'enable' : 'disable';
    setDisableDialog({ isOpen: true, link, action });
  };

  // Execute disable/enable after confirmation
  const executeToggleStatus = async () => {
    const link = disableDialog.link;
    if (!link) return;
    
    const newStatus = disableDialog.action === 'disable' ? 'disabled' : 'active';
    setDisableDialog({ isOpen: false, link: null, action: 'disable' });

    try {
      const response = await fetch(`/api/payment-links?id=${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${disableDialog.action} payment link`);
      }

      await fetchPaymentLinks();
      setAlertDialog({
        isOpen: true,
        title: disableDialog.action === 'disable' ? "Payment Link Disabled" : "Payment Link Enabled",
        description: disableDialog.action === 'disable' 
          ? "The payment link has been disabled. It will no longer accept payments." 
          : "The payment link has been re-enabled and can accept payments again.",
        variant: "success",
      });
    } catch (err) {
      console.error('Error updating payment link:', err);
      setAlertDialog({
        isOpen: true,
        title: "Update Failed",
        description: `Failed to ${disableDialog.action} payment link. Please try again.`,
        variant: "danger",
      });
    }
  };

  // Execute delete after confirmation
  const executeDelete = async () => {
    const linkId = deleteDialog.linkId;
    if (!linkId) return;
    
    setDeleteDialog({ isOpen: false, linkId: null, shortCode: "" });

    try {
      const response = await fetch(`/api/payment-links?id=${linkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment link');
      }

      await fetchPaymentLinks();
      setAlertDialog({
        isOpen: true,
        title: "Payment Link Deleted",
        description: "The payment link has been permanently deleted.",
        variant: "success",
      });
    } catch (err) {
      console.error('Error deleting payment link:', err);
      setAlertDialog({
        isOpen: true,
        title: "Delete Failed",
        description: 'Failed to delete payment link. Please try again.',
        variant: "danger",
      });
    }
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Payment Links"
        description="Create shareable payment links for your customers"
        actions={
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={fetchPaymentLinks} disabled={isLoading} className="h-9 w-9">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create</span> Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Payment Link</DialogTitle>
                  <DialogDescription>
                    Generate a shareable link for customers to pay you instantly.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={newLink.amount}
                      onChange={(e) => setNewLink({ ...newLink, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={newLink.currency}
                        onValueChange={(value) => setNewLink({ ...newLink, currency: value })}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.symbol} value={currency.symbol}>
                              {currency.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">Max Uses (optional)</Label>
                      <Input
                        id="maxUses"
                        type="number"
                        placeholder="Unlimited"
                        value={newLink.maxUses}
                        onChange={(e) => setNewLink({ ...newLink, maxUses: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresIn">Expires In</Label>
                      <Select
                        value={newLink.expiresIn}
                        onValueChange={(value) => setNewLink({ ...newLink, expiresIn: value })}
                      >
                        <SelectTrigger id="expiresIn">
                          <SelectValue placeholder="Never" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Never</SelectItem>
                          <SelectItem value="1d">1 Day</SelectItem>
                          <SelectItem value="7d">7 Days</SelectItem>
                          <SelectItem value="30d">30 Days</SelectItem>
                          <SelectItem value="90d">90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLink} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Link'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Search */}
        <Card variant="glass">
          <CardContent className="pt-4 sm:pt-6">
            <div className="relative">
              <Input
                placeholder="Search payment links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <Card variant="glass">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchPaymentLinks}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Links Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLinks.map((link) => (
              <Card key={link.id} variant="glass" className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600 dark:from-violet-900/30 dark:to-indigo-900/30 dark:text-violet-400">
                        <Link2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{link.shortCode}</CardTitle>
                        <p className="text-sm text-slate-500">{formatCurrency(link.amount, link.currency)}</p>
                      </div>
                    </div>
                    <Badge variant={statusColors[link.status]} dot>
                      {link.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50">
                    <span className="text-sm text-slate-500">Amount</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(link.amount, link.currency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Uses</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {link.uses} {link.maxUses && `/ ${link.maxUses}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Created</span>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {formatDate(new Date(link.createdAt))}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => copyToClipboard(getPaymentUrl(link.shortCode), link.id)}
                    >
                      {copiedId === link.id ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedLink(link);
                        setQrDialogOpen(true);
                      }}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Link href={getPaymentUrl(link.shortCode)} target="_blank">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    {/* Show disable/enable button for used links, delete button for unused links */}
                    {(link.uses > 0 || link.usedCount > 0) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={link.status === 'disabled' 
                          ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          : "text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                        }
                        onClick={() => openDisableDialog(link)}
                        title={link.status === 'disabled' ? 'Enable link' : 'Disable link'}
                      >
                        {link.status === 'disabled' ? <Power className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => openDeleteDialog(link)}
                        title="Delete link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !error && filteredLinks.length === 0 && (
          <Card variant="glass">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Link2 className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                No payment links found
              </h3>
              <p className="mt-2 text-slate-500">
                {searchQuery ? "Try adjusting your search" : "Create your first payment link"}
              </p>
              {!searchQuery && (
                <Button className="mt-4 gap-2" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create Payment Link
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Payment QR Code</DialogTitle>
            <DialogDescription>
              Scan this code to pay {selectedLink?.shortCode}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {selectedLink && (
              <>
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={getPaymentUrl(selectedLink.shortCode)}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(selectedLink.amount, selectedLink.currency)}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {getPaymentUrl(selectedLink.shortCode)}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => selectedLink && copyToClipboard(getPaymentUrl(selectedLink.shortCode), "qr")}
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
            <Button className="flex-1">Download QR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, linkId: null, shortCode: "" })}
        onConfirm={executeDelete}
        title="Delete Payment Link"
        description={`Are you sure you want to delete payment link "${deleteDialog.shortCode}"? This action cannot be undone and any pending payments will no longer work.`}
        confirmText="Delete Link"
        cancelText="Keep Link"
        variant="danger"
        icon={<Trash2 className="h-6 w-6" />}
      />

      {/* Disable/Enable Confirmation Dialog */}
      <ConfirmDialog
        isOpen={disableDialog.isOpen}
        onClose={() => setDisableDialog({ isOpen: false, link: null, action: 'disable' })}
        onConfirm={executeToggleStatus}
        title={disableDialog.action === 'disable' ? "Disable Payment Link" : "Enable Payment Link"}
        description={
          disableDialog.action === 'disable' 
            ? `Are you sure you want to disable payment link "${disableDialog.link?.shortCode}"? It will no longer accept new payments, but existing transactions will not be affected.`
            : `Are you sure you want to re-enable payment link "${disableDialog.link?.shortCode}"? It will start accepting payments again.`
        }
        confirmText={disableDialog.action === 'disable' ? "Disable Link" : "Enable Link"}
        cancelText="Cancel"
        variant={disableDialog.action === 'disable' ? "warning" : "default"}
        icon={disableDialog.action === 'disable' ? <Ban className="h-6 w-6" /> : <Power className="h-6 w-6" />}
      />

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
          <Link2 className="h-6 w-6" />
        }
      />
    </div>
  );
}
