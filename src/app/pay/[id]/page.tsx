"use client";

import React, { useState, use, useCallback, useEffect } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Separator, Input, Label } from "@/components/ui";
import {
  Wallet,
  Fingerprint,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
  Plus,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-context";
import { SwapModal } from "@/components/swap-modal";
import type { FXQuote, FXExecuteResult, PayableTokenRow } from "@/lib/services/fx-service";
import { getFXService } from "@/lib/services/fx-service";

interface PaymentPageProps {
  params: Promise<{ id: string }>;
}

interface PaymentLinkData {
  id: string;
  shortCode: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  business?: {
    name: string;
    walletAddress: string;
  };
}

type PaymentStep = "loading" | "select_method" | "passkey_auth" | "wallet_connect" | "ready" | "authenticating" | "processing" | "success" | "error" | "not_found" | "expired";
type PaymentMethod = "passkey" | "wallet" | null;

export default function PaymentPage({ params }: PaymentPageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const {
    isConnected,
    address,
    passkeySupported,
    hasStoredPasskey,
    preparePayment,
    confirmPayment,
    connect,
    connectPasskey,
    registerNewPasskey,
    disconnect,
    switchWallet,
    connectionMethod,
  } = useWallet();

  const [step, setStep] = useState<PaymentStep>("loading");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPasskeySupported, setLocalPasskeySupported] = useState<boolean | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [showCreatePasskey, setShowCreatePasskey] = useState(false);
  const [newPasskeyUsername, setNewPasskeyUsername] = useState("");
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  // Multi-stablecoin swap state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedPaymentCurrency, setSelectedPaymentCurrency] = useState<string | null>(null);
  const [activeSwapQuote, setActiveSwapQuote] = useState<FXQuote | null>(null);

  // Precomputed list of tokens in the payer's wallet that can actually settle
  // this invoice via Sera. Computed once on wallet connect so the swap modal
  // opens to an already-filtered, balance-aware picker.
  const [payableTokens, setPayableTokens] = useState<PayableTokenRow[] | null>(null);
  const [payableLoading, setPayableLoading] = useState(false);
  const [payableError, setPayableError] = useState<string | null>(null);

  // Check passkey support locally (more reliable than context on initial render)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use dynamic import to get the proper check from simplewebauthn
      import('@simplewebauthn/browser').then(({ browserSupportsWebAuthn }) => {
        setLocalPasskeySupported(browserSupportsWebAuthn());
      }).catch(() => {
        // Fallback to basic check if import fails
        const supported = !!(
          window.PublicKeyCredential &&
          typeof window.PublicKeyCredential === 'function'
        );
        setLocalPasskeySupported(supported);
      });
    }
  }, []);

  // Fetch payment link data on mount
  useEffect(() => {
    const fetchPaymentLink = async () => {
      try {
        const response = await fetch(`/api/pay/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setStep("not_found");
            return;
          }
          throw new Error("Failed to fetch payment link");
        }
        const data = await response.json();
        const link = data.paymentLink;

        // Check if expired
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
          setStep("expired");
          setPaymentLink(link);
          return;
        }

        // Check if max uses reached
        if (link.maxUses && link.usedCount >= link.maxUses) {
          setStep("expired");
          setPaymentLink(link);
          return;
        }

        // Check status
        if (link.status !== "active") {
          setStep("expired");
          setPaymentLink(link);
          return;
        }

        setPaymentLink(link);
        setStep(isConnected ? "ready" : "select_method");
      } catch (err) {
        console.error("Error fetching payment link:", err);
        setError("Failed to load payment details");
        setStep("error");
      }
    };

    fetchPaymentLink();
  }, [id, isConnected]);

  // Update step when connection changes
  useEffect(() => {
    if (isConnected && (step === "select_method" || step === "passkey_auth" || step === "wallet_connect")) {
      setStep("ready");
    }
  }, [isConnected, step]);

  // Auto-close countdown on success
  useEffect(() => {
    if (step === "success") {
      setAutoCloseCountdown(10);
      const interval = setInterval(() => {
        setAutoCloseCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            // Try to close the window/tab
            if (window.opener) {
              window.close();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  // Background precompute: which of the payer's tokens can actually settle
  // this invoice via Sera? We pull live balances from /api/wallet/tokens,
  // then hand them to /api/sera/payable-tokens which batch-quotes Sera. The
  // swap modal opens to an already-filtered picker (no per-tap quote latency,
  // no NO_LIQUIDITY dead-ends).
  useEffect(() => {
    if (!isConnected || !address || !paymentLink) {
      setPayableTokens(null);
      setPayableError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setPayableLoading(true);
        setPayableError(null);

        const balRes = await fetch(`/api/wallet/tokens?address=${address}`, { cache: 'no-store' });
        const balText = await balRes.text();
        let balBody: { tokens?: Array<{ symbol: string; address: string; decimals: number; balance: string }> };
        try {
          balBody = balText ? JSON.parse(balText) : {};
        } catch {
          throw new Error(
            `Wallet balance lookup returned non-JSON (${balRes.status}). ` +
            `If you see <!DOCTYPE in the body, the API was redirected to login — ` +
            `check middleware publicRoutes.`,
          );
        }
        if (!balRes.ok) {
          throw new Error(
            (balBody as { error?: string }).error
              || `Wallet balance lookup failed (${balRes.status})`,
          );
        }
        const candidates = (balBody.tokens || [])
          .filter(t => t.address && t.address !== 'native' && parseFloat(t.balance) > 0)
          .map(t => {
            // Convert "1.50" → integer raw using BigInt to avoid float loss.
            const [whole, frac = ''] = t.balance.split('.');
            const fracPadded = (frac + '0'.repeat(t.decimals)).slice(0, t.decimals);
            const raw = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, '') || '0';
            return { address: t.address, symbol: t.symbol, balanceRaw: raw };
          });

        if (candidates.length === 0) {
          if (!cancelled) {
            setPayableTokens([]);
            setPayableLoading(false);
          }
          return;
        }

        const result = await getFXService().getPayableTokens({
          payer: address,
          recipient: paymentLink.business?.walletAddress
            || "0x742d35Cc6634C0532925a3b844Bc9e7595f5bE40",
          toToken: paymentLink.currency,
          toAmount: paymentLink.amount.toString(),
          candidates,
        });

        if (!cancelled) {
          setPayableTokens(result.payable);
          setPayableLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setPayableError(e instanceof Error ? e.message : 'Could not check payable tokens');
          setPayableTokens([]);
          setPayableLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, paymentLink]);

  // Handle passkey authentication (existing passkey)
  const handlePasskeyAuth = useCallback(async () => {
    setError(null);
    setStep("authenticating");

    try {
      await connectPasskey('authenticate');
      setPaymentMethod('passkey');
      setStep("ready");
    } catch (err) {
      console.error("Passkey auth failed:", err);
      setError(err instanceof Error ? err.message : "Failed to authenticate with passkey");
      setStep("passkey_auth");
    }
  }, [connectPasskey]);

  // Handle new passkey registration
  const handleCreatePasskey = useCallback(async () => {
    if (!newPasskeyUsername.trim()) {
      setError("Please enter a username");
      return;
    }

    setError(null);
    setStep("authenticating");

    try {
      await registerNewPasskey(newPasskeyUsername.trim());
      setPaymentMethod('passkey');
      setShowCreatePasskey(false);
      setNewPasskeyUsername("");
      setStep("ready");
    } catch (err) {
      console.error("Passkey creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create passkey");
      setStep("passkey_auth");
    }
  }, [newPasskeyUsername, registerNewPasskey]);

  // Handle wallet connection (direct to browser wallet like MetaMask)
  const handleWalletConnect = useCallback(async () => {
    setError(null);
    setIsConnectingWallet(true);

    try {
      // Try injected wallet first (MetaMask, etc.), fall back to WalletConnect
      await connect('injected');
      setPaymentMethod('wallet');
      setStep("ready");
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setIsConnectingWallet(false);
    }
  }, [connect]);

  const handlePayment = useCallback(async () => {
    if (!isConnected || !paymentLink) return;

    setError(null);
    setStep("authenticating");

    try {
      // Get merchant wallet address from payment link's business
      const merchantAddress = paymentLink.business?.walletAddress || "0x742d35Cc6634C0532925a3b844Bc9e7595f5bE40";

      console.log('[Payment] Preparing payment...', {
        merchantAddress,
        amount: paymentLink.amount.toString(),
        currency: paymentLink.currency,
        paymentMethod,
      });

      // Prepare and sign the transfer (triggers biometric prompt)
      // Always pass the currency/token symbol so the correct Sera token is used
      const { transferId } = await preparePayment(
        merchantAddress,
        paymentLink.amount.toString(),
        paymentLink.currency // Pass the currency symbol (USDC, USDT, EUR, etc.)
      );

      console.log('[Payment] Prepared, transferId:', transferId);

      setStep("processing");

      console.log('[Payment] Confirming payment...');

      // Execute the signed transfer
      const result = await confirmPayment(transferId);

      console.log('[Payment] Payment confirmed:', result);

      // For passkey payments, poll for the final target chain tx hash
      let finalTxHash = result.txHash;
      if (result.sequence) {
        console.log('[Payment] Polling for target chain tx hash, sequence:', result.sequence);

        // Show user we're waiting for confirmation
        setStep("processing");

        // Import and call polling function
        const { pollForTransactionCompletion } = await import('@/lib/veridex-client');
        const completion = await pollForTransactionCompletion(result.sequence, {
          maxAttempts: 40, // ~2 minutes
          intervalMs: 3000,
          type: 'sequence',
        });

        if (completion.found && completion.status === 'completed' && completion.targetTxHash) {
          console.log('[Payment] Target chain tx confirmed:', completion.targetTxHash);
          finalTxHash = completion.targetTxHash;
        } else if (completion.found && completion.status === 'failed') {
          console.error('[Payment] Transaction failed on target chain:', completion.errorMessage);
          throw new Error(completion.errorMessage || 'Transaction failed on target chain');
        } else {
          console.warn('[Payment] Could not get final tx hash, using hub tx hash');
          // Fall back to hub tx hash
        }
      }

      setTxHash(finalTxHash);

      // Record the transaction in the database
      try {
        const recordResponse = await fetch('/api/pay/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentLinkId: paymentLink.id,
            txHash: finalTxHash,
            payerAddress: address,
            amount: paymentLink.amount,
            currency: paymentLink.currency,
          }),
        });

        if (!recordResponse.ok) {
          console.error('Failed to record transaction:', await recordResponse.text());
        } else {
          const recordData = await recordResponse.json();
          console.log('Transaction recorded:', recordData);
        }
      } catch (recordError) {
        // Don't fail the payment if recording fails - tx is already on-chain
        console.error('Failed to record transaction:', recordError);
      }

      setStep("success");
    } catch (err) {
      console.error("Payment failed:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setStep("error");
    }
  }, [isConnected, preparePayment, confirmPayment, paymentLink, address]);

  // Handle swap confirmation — Sera has already executed the swap by this
  // point; we just need to record it and surface the trade as the payment tx.
  const handleSwapConfirm = useCallback(async (result: FXExecuteResult & { quote: FXQuote }) => {
    try {
      const { quote } = result;
      setActiveSwapQuote(quote);
      setSelectedPaymentCurrency(quote.inputToken);
      setShowSwapModal(false);

      if (!paymentLink) {
        throw new Error("Payment link invalid");
      }

      const finalTxHash = result.txHash || result.tradeId || null;
      setTxHash(finalTxHash);

      // Record the swap-payment for merchant settlement / reporting
      try {
        const recordResponse = await fetch('/api/pay/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentLinkId: paymentLink.id,
            txHash: finalTxHash,
            payerAddress: address,
            amount: paymentLink.amount,
            currency: paymentLink.currency,
            swapQuote: quote,
            tradeId: result.tradeId,
          }),
        });

        if (!recordResponse.ok) {
          console.error('Failed to record transaction:', await recordResponse.text());
        }
      } catch (recordError) {
        console.error('Failed to record transaction:', recordError);
      }

      setStep("success");
    } catch (err) {
      console.error("Swap payment failed:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setStep("error");
      setShowSwapModal(false);
    }
  }, [paymentLink, address]);

  const handleRetry = () => {
    setError(null);
    setStep("ready");
  };

  // Use local check if context hasn't updated yet
  const isPasskeyAvailable = localPasskeySupported ?? passkeySupported;

  // Loading state
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-zinc-400">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (step === "not_found") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20">
          <CardContent className="pt-12 pb-8 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg mb-6">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Link Not Found</h2>
            <p className="text-zinc-300">
              This payment link doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired state
  if (step === "expired") {
    const isUsedUp = paymentLink?.maxUses && paymentLink.usedCount >= paymentLink.maxUses;
    const isTimeExpired = paymentLink?.expiresAt && new Date(paymentLink.expiresAt) < new Date();
    const isInactive = paymentLink?.status === "used" || paymentLink?.status === "cancelled";

    // Show crying emoji for used up links
    if (isUsedUp || isInactive) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 flex items-center justify-center p-4 overflow-hidden">
          {/* Floating tear drops animation */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-4 bg-gradient-to-b from-blue-400/40 to-blue-500/20 rounded-full animate-bounce"
                style={{
                  left: `${15 + i * 10}%`,
                  top: `${20 + (i % 3) * 15}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${1.5 + (i % 2) * 0.5}s`,
                }}
              />
            ))}
          </div>

          <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 relative overflow-hidden">
            {/* Sad gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

            <CardContent className="pt-12 pb-8 flex flex-col items-center text-center relative">
              {/* Animated crying emoji */}
              <div className="relative mb-6">
                <div className="text-8xl animate-pulse">😢</div>
                {/* Tear drops falling */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-4">
                  <div className="w-2 h-3 bg-gradient-to-b from-blue-400 to-blue-500/50 rounded-full animate-bounce"
                    style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-3 bg-gradient-to-b from-blue-400 to-blue-500/50 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Oops! Already Used</h2>
              <p className="text-zinc-300 mb-4">
                This payment link has already been claimed and can no longer be used.
              </p>

              {/* Usage info */}
              {paymentLink && paymentLink.maxUses && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-300 text-sm">
                    Used {paymentLink.usedCount} of {paymentLink.maxUses} {paymentLink.maxUses === 1 ? 'time' : 'times'}
                  </span>
                </div>
              )}

              <p className="text-sm text-zinc-500">
                Please request a new payment link from the merchant.
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 text-sm text-zinc-600">
            <ShieldCheck className="h-4 w-4" />
            <span>Secured by Sera Protocol</span>
          </div>
        </div>
      );
    }

    // Show expired state for time-expired links
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20">
          <CardContent className="pt-12 pb-8 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/30 mb-6">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Link Expired</h2>
            <p className="text-zinc-300">
              {isTimeExpired
                ? "This payment link has expired and is no longer active."
                : "This payment link is no longer active."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    const merchantName = paymentLink?.business?.name || "Merchant";

    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
        {/* Confetti-like decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-2 h-2 bg-emerald-400 rounded-full animate-pulse opacity-60" />
          <div className="absolute top-40 right-20 w-3 h-3 bg-green-400 rounded-full animate-bounce opacity-40" />
          <div className="absolute bottom-40 left-20 w-2 h-2 bg-teal-400 rounded-full animate-ping opacity-50" />
          <div className="absolute top-60 right-10 w-1 h-1 bg-emerald-300 rounded-full animate-pulse opacity-70" />
          <div className="absolute bottom-20 right-40 w-2 h-2 bg-green-300 rounded-full animate-bounce opacity-30" />
        </div>

        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

          <CardContent className="pt-12 pb-8 flex flex-col items-center text-center relative">
            {/* Animated success checkmark */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-2xl shadow-emerald-500/40">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
            </div>

            {/* Thank you message */}
            <h2 className="text-3xl font-bold text-white mb-2">Thank You!</h2>
            <p className="text-lg text-emerald-300 mb-1">Payment Successful</p>

            {/* Payment amount */}
            <div className="mt-4 mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
              <p className="text-4xl font-bold text-white">
                {paymentLink && formatCurrency(paymentLink.amount, paymentLink.currency)}
              </p>
              <Badge variant="success" className="mt-2">
                {paymentLink?.currency}
              </Badge>
            </div>

            {/* Merchant info */}
            <div className="w-full p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">{merchantName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{merchantName}</p>
                  <p className="text-xs text-zinc-400">Merchant</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400">
                Your payment has been securely processed and confirmed on the blockchain.
              </p>
            </div>

            {/* Transaction hash */}
            {txHash && (
              <a
                href={paymentMethod === 'passkey'
                  ? `https://sepolia.basescan.org/tx/${txHash}`
                  : `https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 mb-4 hover:bg-white/10 transition-colors group"
              >
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Transaction ID</span>
                  <span className="text-white font-mono flex items-center gap-2">
                    {txHash.slice(0, 8)}...{txHash.slice(-6)}
                    <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {paymentMethod === 'passkey' ? 'View on Base Sepolia' : 'View on Ethereum Sepolia'}
                </div>
              </a>
            )}

            {/* Auto-close countdown */}
            {autoCloseCountdown !== null && autoCloseCountdown > 0 && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-600 flex items-center justify-center">
                  <span className="text-xs">{autoCloseCountdown}</span>
                </div>
                <span>This page will close automatically...</span>
              </div>
            )}

            {/* Receipt note */}
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Receipt sent to your wallet</span>
            </div>
          </CardContent>
        </Card>

        {/* Footer branding */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 text-sm text-zinc-600">
          <ShieldCheck className="h-4 w-4" />
          <span>Secured by Sera Protocol</span>
        </div>
      </div>
    );
  }

  if (step === "error" && !paymentLink) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20">
          <CardContent className="pt-12 pb-8 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30 mb-6">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something Went Wrong</h2>
            <p className="text-zinc-300 mb-6">
              {error || "Unable to load payment details."}
            </p>
            <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20">
          <CardContent className="pt-12 pb-8 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30 mb-6">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Failed</h2>
            <p className="text-zinc-300 mb-6">
              {error || "Something went wrong. Please try again."}
            </p>
            <Button
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
              onClick={handleRetry}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentLink) {
    return null;
  }

  const merchantName = paymentLink.business?.name || "Merchant";

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-cyan-600 shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-xl font-bold text-white">{merchantName.charAt(0).toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{merchantName}</h1>
          <p className="text-zinc-400">Secure payment Powered by Settla</p>
        </div>

        {/* Payment Details Card */}
        <Card className="bg-white/10 backdrop-blur-xl border-white/20">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-white text-lg">{paymentLink.shortCode}</CardTitle>
            <CardDescription className="text-zinc-300">
              Payment Request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount Display */}
            <div className="text-center p-6 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border border-emerald-500/30">
              <p className="text-sm text-zinc-400 mb-1">Amount Due</p>
              <p className="text-4xl font-bold text-white">
                {formatCurrency(paymentLink.amount, paymentLink.currency)}
              </p>
              <Badge variant="violet" className="mt-2">
                {paymentLink.currency}
              </Badge>
            </div>

            {step === "select_method" && (
              <>
                <Separator className="bg-white/20" />

                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 text-center">Choose payment method</p>

                  {/* Passkey Option */}
                  <button
                    onClick={() => setStep("passkey_auth")}
                    disabled={!isPasskeyAvailable}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 hover:from-emerald-600/30 hover:to-cyan-600/30 disabled:from-gray-600/10 disabled:to-gray-600/10 border border-emerald-500/30 disabled:border-gray-500/30 rounded-xl transition-all transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed"
                  >
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Fingerprint className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-white">Pay with Passkey</div>
                      <div className="text-sm text-zinc-400">
                        Touch ID, Face ID, or security key
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-400" />
                  </button>

                  {/* Wallet Option */}
                  <button
                    onClick={() => setStep("wallet_connect")}
                    className="w-full flex items-center gap-4 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all transform hover:scale-[1.02]"
                  >
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-white">Pay with Wallet</div>
                      <div className="text-sm text-zinc-400">
                        MetaMask, Rainbow, Coinbase...
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-400" />
                  </button>

                  {!isPasskeyAvailable && (
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-yellow-300/70 text-xs">
                          Passkeys not supported in this browser. Use wallet instead.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === "passkey_auth" && (
              <>
                <Separator className="bg-white/20" />

                {/* Passkey Authentication */}
                <div className="space-y-4">
                  <button
                    onClick={() => setStep("select_method")}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to payment methods
                  </button>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  {!showCreatePasskey ? (
                    <>
                      {/* Use Existing Passkey */}
                      <button
                        onClick={handlePasskeyAuth}
                        className="w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                      >
                        <Fingerprint className="h-6 w-6" />
                        Sign in with Passkey
                      </button>

                      <p className="text-center text-xs text-zinc-500">
                        Use any passkey from this device or synced via iCloud/Google
                      </p>

                      {/* Create New Passkey Option */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-transparent text-zinc-500">or</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowCreatePasskey(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 hover:border-white/40 rounded-xl text-zinc-400 hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create new passkey wallet
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Create New Passkey Form */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="passkeyUsername" className="text-zinc-300">
                            Choose a username
                          </Label>
                          <Input
                            id="passkeyUsername"
                            placeholder="e.g., alice, my-wallet"
                            value={newPasskeyUsername}
                            onChange={(e) => setNewPasskeyUsername(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-zinc-500"
                          />
                          <p className="text-xs text-zinc-500">
                            This creates a new wallet secured by your device
                          </p>
                        </div>

                        <button
                          onClick={handleCreatePasskey}
                          disabled={!newPasskeyUsername.trim()}
                          className="w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed shadow-lg"
                        >
                          <Fingerprint className="h-6 w-6" />
                          Create & Pay
                        </button>

                        <button
                          onClick={() => {
                            setShowCreatePasskey(false);
                            setNewPasskeyUsername("");
                            setError(null);
                          }}
                          className="w-full text-center text-sm text-zinc-400 hover:text-white"
                        >
                          Back to sign in
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {step === "wallet_connect" && (
              <>
                <Separator className="bg-white/20" />

                {/* Wallet Connect */}
                <div className="space-y-4">
                  <button
                    onClick={() => setStep("select_method")}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to payment methods
                  </button>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleWalletConnect}
                    disabled={isConnectingWallet}
                    className="w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] disabled:transform-none shadow-lg"
                  >
                    {isConnectingWallet ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-6 w-6" />
                        Connect Wallet
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-zinc-500">
                    Connect MetaMask, Rainbow, Coinbase Wallet, or any WalletConnect-compatible wallet
                  </p>
                </div>
              </>
            )}

            {step === "ready" && (
              <>
                <Separator className="bg-white/20" />

                {/* Connected State */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-300 text-sm">
                        {paymentMethod === 'passkey' ? 'Passkey Connected' : 'Wallet Connected'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                      <button
                        onClick={async () => {
                          // If the user is on a passkey wallet, "Change" should
                          // let them swap in a different wallet for this
                          // payment WITHOUT logging out of their passkey
                          // account. For non-passkey wallets, fall back to a
                          // full disconnect so they can re-pick a method.
                          if (connectionMethod === 'passkey') {
                            try {
                              await switchWallet('injected');
                              setPaymentMethod('wallet');
                              setStep('ready');
                            } catch (err) {
                              console.error('switchWallet failed:', err);
                              setError(err instanceof Error ? err.message : 'Failed to switch wallet');
                            }
                          } else {
                            disconnect();
                            setPaymentMethod(null);
                            setStep('select_method');
                          }
                        }}
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Amount</span>
                      <span className="text-white font-medium">
                        {formatCurrency(paymentLink.amount, paymentLink.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Invoice Currency</span>
                      <span className="text-white font-medium">{paymentLink.currency}</span>
                    </div>

                    {/* Multi-Stablecoin Selector */}
                    <div className="pt-2 border-t border-white/10">
                      <button
                        onClick={() => setShowSwapModal(true)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-left">
                          <DollarSign className="h-4 w-4 text-cyan-400" />
                          <div>
                            <p className="text-xs text-zinc-500">Pay with</p>
                            <p className="text-white font-medium">
                              {selectedPaymentCurrency || paymentLink.currency}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-cyan-400" />
                      </button>
                      <p className="text-xs text-zinc-500 mt-2">
                        Choose any stablecoin • Auto-converted to {paymentLink.currency}
                      </p>
                    </div>

                    <Separator className="bg-white/10" />
                    <div className="flex justify-between">
                      <span className="text-zinc-300 font-medium">Network Fee</span>
                      <span className="text-emerald-400">Free (Gasless)</span>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={selectedPaymentCurrency ? () => setShowSwapModal(true) : handlePayment}
                    className="w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  >
                    {paymentMethod === 'passkey' ? (
                      <>
                        <Fingerprint className="h-6 w-6" />
                        Confirm with Passkey
                      </>
                    ) : (
                      <>
                        <Wallet className="h-6 w-6" />
                        Confirm Payment
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {step === "authenticating" && (
              <div className="flex flex-col items-center py-8">
                <div className="relative mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Fingerprint className="h-8 w-8 text-emerald-400 animate-pulse" />
                  </div>
                </div>
                <p className="text-white font-medium">Confirm with Passkey</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Touch ID, Face ID, or security key
                </p>
              </div>
            )}

            {step === "processing" && (
              <div className="flex flex-col items-center py-8">
                <div className="relative mb-4">
                  <div className="h-16 w-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6 text-emerald-400" />
                  </div>
                </div>
                <p className="text-white font-medium">Processing payment...</p>
                <p className="text-sm text-zinc-400 mt-1">
                  Settling via Sera Protocol
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <ShieldCheck className="h-4 w-4" />
          <span>Secured by Veridex Protocol • Gasless Payments</span>
        </div>
      </div>

      {/* Swap Modal for Multi-Stablecoin Selection */}
      {paymentLink && (
        <SwapModal
          isOpen={showSwapModal}
          onClose={() => setShowSwapModal(false)}
          defaultInputToken={selectedPaymentCurrency || paymentLink.currency}
          defaultOutputToken={paymentLink.currency}
          defaultAmount={paymentLink.amount.toString()}
          recipientAddress={paymentLink.business?.walletAddress || "0x742d35Cc6634C0532925a3b844Bc9e7595f5bE40"}
          onSwapConfirm={handleSwapConfirm}
          payableTokens={payableTokens}
          payableLoading={payableLoading}
          payableError={payableError}
        />
      )}
    </div>
  );
}
