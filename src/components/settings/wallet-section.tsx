"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Badge, Separator } from "@/components/ui";
import {
  Wallet,
  Copy,
  Check,
  Send,
  ArrowDownLeft,
  Loader2,
  ExternalLink,
  RefreshCw,
  X,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "@/lib/wallet-context";
import { formatAddress } from "@/lib/utils";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
  balance: string;
  balanceUsd: number;
  currency?: string; // e.g., USD, EUR, GBP
}

interface WalletTokens {
  address: string;
  tokens: Token[];
  totalUsd: string;
}

export function WalletSection() {
  const { address, isConnected, preparePayment, confirmPayment } = useWallet();
  const [walletData, setWalletData] = useState<WalletTokens | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendData, setSendData] = useState({
    toAddress: '',
    amount: '',
    currency: 'USDC',
    note: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/wallet/tokens?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setWalletData(data);
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchTokens();
    }
  }, [address, fetchTokens]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!sendData.toAddress || !sendData.amount) {
      setSendError('Please fill in all required fields');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(sendData.toAddress)) {
      setSendError('Invalid recipient address');
      return;
    }

    const amount = parseFloat(sendData.amount);
    if (isNaN(amount) || amount <= 0) {
      setSendError('Invalid amount');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    let transactionId: string | null = null;

    try {
      // 1. Create pending transaction in database
      const res = await fetch('/api/wallet/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to initialize transaction');
      }

      const result = await res.json();
      transactionId = result.transactionId;

      console.log('[WalletSection] Transaction initialized:', transactionId);

      // 2. Prepare payment via SDK
      const { transferId } = await preparePayment(
        sendData.toAddress,
        sendData.amount,
        sendData.currency
      );

      console.log('[WalletSection] Payment prepared, transferId:', transferId);

      // 3. Confirm and execute payment (user signs here)
      const executionResult = await confirmPayment(transferId);

      console.log('[WalletSection] Payment confirmed:', executionResult);

      let finalTxHash = executionResult.txHash;
      let finalStatus = executionResult.status;

      // 4. If passkey payment (has sequence), poll for final status
      if (executionResult.sequence) {
        console.log('[WalletSection] Polling for completion, sequence:', executionResult.sequence);
        const { pollForTransactionCompletion } = await import('@/lib/veridex-client');

        const completion = await pollForTransactionCompletion(executionResult.sequence, {
          maxAttempts: 40,
          intervalMs: 3000,
          type: 'sequence'
        });

        if (completion.found && completion.status === 'completed' && completion.targetTxHash) {
          finalTxHash = completion.targetTxHash;
          finalStatus = 'completed'; // Map to 'settled' or 'confirmed' for backend
        } else if (completion.found && completion.status === 'failed') {
          throw new Error(completion.errorMessage || 'Transaction failed on network');
        }
      }

      // 5. Update backend with final status
      if (transactionId) {
        await fetch('/api/wallet/send', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId,
            txHash: finalTxHash,
            status: 'completed', // Using 'completed' to mark as done
          }),
        });
      }

      setSendSuccess(`Transaction successfully sent! Hash: ${finalTxHash.slice(0, 10)}...`);

      // Reset form
      setSendData({ toAddress: '', amount: '', currency: 'USDC', note: '' });

      // Refresh tokens after a delay
      setTimeout(() => {
        fetchTokens();
        setShowSend(false);
        setSendSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Send error:', error);
      setSendError(error instanceof Error ? error.message : 'Transaction failed');

      // Attempt to mark as failed in backend if we have an ID
      if (transactionId) {
        try {
          await fetch('/api/wallet/send', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionId,
              status: 'failed',
            }),
          });
        } catch (e) {
          console.error('Failed to update transaction status to failed:', e);
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet
          </CardTitle>
          <CardDescription>Connect your wallet to view balances and send/receive funds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No wallet connected</p>
            <p className="text-sm mt-2">Please connect a passkey or wallet to view your balances</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet
            </CardTitle>
            <CardDescription>Manage your wallet and token balances</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchTokens} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Address */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Your Wallet Address</p>
              <p className="font-mono text-sm font-medium">{formatAddress(address)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <a
              href={`https://sepolia.etherscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-16 flex-col gap-1"
            onClick={() => { setShowReceive(!showReceive); setShowSend(false); }}
          >
            <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
            <span>Receive</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1"
            onClick={() => { setShowSend(!showSend); setShowReceive(false); }}
          >
            <Send className="h-5 w-5 text-blue-500" />
            <span>Send</span>
          </Button>
        </div>

        {/* Receive Modal */}
        {showReceive && (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Receive Funds</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowReceive(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-xl">
                <QRCodeSVG
                  value={address}
                  size={200}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: "/logo.png",
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              <p className="text-sm text-slate-500 text-center">
                Scan this QR code to send funds to this wallet
              </p>

              <div className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-mono text-xs break-all text-center">{address}</p>
              </div>

              <Button onClick={copyAddress} className="w-full gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Address Copied!' : 'Copy Address'}
              </Button>
            </div>
          </div>
        )}

        {/* Send Modal */}
        {showSend && (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Send Funds</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSend(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {sendError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{sendError}</p>
              </div>
            )}

            {sendSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{sendSuccess}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="toAddress">Recipient Address *</Label>
                <Input
                  id="toAddress"
                  placeholder="0x..."
                  value={sendData.toAddress}
                  onChange={(e) => setSendData(prev => ({ ...prev, toAddress: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={sendData.amount}
                    onChange={(e) => setSendData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={sendData.currency}
                    onChange={(e) => setSendData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="USDC">USDC</option>
                    <option value="EURC">EURC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  placeholder="Payment for..."
                  value={sendData.note}
                  onChange={(e) => setSendData(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={isSending}
                className="w-full gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send {sendData.currency}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Token Balances */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Token Balances</h3>
              <p className="text-sm text-slate-500">All Sera-supported stablecoins</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllTokens(!showAllTokens)}
                className="text-xs"
              >
                {showAllTokens ? 'Show With Balance' : 'Show All Tokens'}
              </Button>
              {walletData && (
                <Badge variant="success" className="text-lg px-3 py-1">
                  ${walletData.totalUsd} USD
                </Badge>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : walletData?.tokens && walletData.tokens.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
              {/* Group tokens: show tokens with balance first, then others if showAllTokens */}
              {(() => {
                const tokensWithBalance = walletData.tokens.filter(t => parseFloat(t.balance) > 0);
                const tokensWithoutBalance = walletData.tokens.filter(t => parseFloat(t.balance) === 0);
                const displayTokens = showAllTokens
                  ? [...tokensWithBalance, ...tokensWithoutBalance]
                  : tokensWithBalance.length > 0 ? tokensWithBalance : walletData.tokens.slice(0, 13); // Show primary tokens if no balance

                // Group by currency
                const groupedByCurrency = displayTokens.reduce((acc, token) => {
                  const currency = token.currency || 'OTHER';
                  if (!acc[currency]) acc[currency] = [];
                  acc[currency].push(token);
                  return acc;
                }, {} as Record<string, Token[]>);

                // Currency order for display
                const currencyOrder = ['USD', 'EUR', 'GBP', 'SGD', 'JPY', 'AUD', 'CAD', 'BRL', 'CHF', 'MXN', 'KRW', 'IDR', 'NZD', 'THB', 'ZAR', 'INR', 'MYR', 'TRY', 'PHP', 'HKD', 'CNH', 'ARS', 'NGN', 'RUB', 'ETH', 'OTHER'];
                const sortedCurrencies = Object.keys(groupedByCurrency).sort((a, b) => {
                  const aIndex = currencyOrder.indexOf(a);
                  const bIndex = currencyOrder.indexOf(b);
                  return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                });

                return sortedCurrencies.map(currency => (
                  <div key={currency} className="space-y-2">
                    {showAllTokens && sortedCurrencies.length > 1 && (
                      <div className="sticky top-0 bg-white dark:bg-slate-900 py-1 z-10">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          {currency === 'ETH' ? 'Native' : currency}
                        </p>
                      </div>
                    )}
                    {groupedByCurrency[currency].map((token) => (
                      <div
                        key={token.symbol}
                        className={`flex items-center justify-between p-3 rounded-xl transition-colors ${parseFloat(token.balance) > 0
                            ? 'bg-slate-50 dark:bg-slate-800/50'
                            : 'bg-slate-50/50 dark:bg-slate-800/25 opacity-60'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center overflow-hidden">
                            {token.logo ? (
                              <img src={token.logo} alt={token.symbol} className="h-5 w-5" />
                            ) : (
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{token.symbol.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{token.symbol}</p>
                            <p className="text-xs text-slate-500">{token.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{token.balance}</p>
                          <p className="text-xs text-slate-500">
                            ${token.balanceUsd?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No tokens found</p>
              <p className="text-sm mt-2">Token balances will appear once you receive funds</p>
            </div>
          )}

          {walletData?.tokens && (
            <p className="text-xs text-slate-400 mt-3 text-center">
              {walletData.tokens.length} Sera-supported tokens available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
