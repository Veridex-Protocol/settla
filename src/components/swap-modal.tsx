'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertCircle,
    ArrowRight,
    Loader2,
    X,
    WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui';
import {
    getFXService,
    FXError,
    type FXQuote,
    type FXExecuteResult,
    type PayableTokenRow,
} from '@/lib/services/fx-service';
import { useWallet } from '@/lib/wallet-context';

interface SwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultInputToken: string;
    defaultOutputToken?: string;
    defaultAmount: string;
    /** Where the merchant should receive the converted tokens. */
    recipientAddress: string;
    /** Called after the swap has been executed on Sera. */
    onSwapConfirm: (result: FXExecuteResult & { quote: FXQuote }) => Promise<void>;
    /**
     * Optional precomputed list of tokens the payer can actually settle this
     * invoice with (Sera batch-quote already filtered out NO_LIQUIDITY etc.).
     * When provided, the input picker is restricted to these symbols. Pass
     * `null` while the precompute is in flight to show a loading state.
     */
    payableTokens?: PayableTokenRow[] | null;
    /** True while the parent is loading the payable-tokens list. */
    payableLoading?: boolean;
    /** Surface-level error from the precompute (rendered as a banner). */
    payableError?: string | null;
}

interface TokenOption {
    symbol: string;
    label: string;
    available: boolean;
}

const FALLBACK_TOKENS: TokenOption[] = [
    { symbol: 'USDC', label: 'USD Coin', available: true },
    { symbol: 'EURC', label: 'Euro Coin', available: true },
    { symbol: 'XSGD', label: 'Singapore Dollar', available: true },
];

/**
 * Map Sera typed error_code → display text. Per docs.sera.cx, branching is on
 * error_code; the upstream `detail` string is for display only.
 */
function formatQuoteError(err: unknown, inputToken: string, outputToken: string): string {
    if (err instanceof FXError) {
        switch (err.code) {
            case 'NO_LIQUIDITY':
                return `No liquidity for ${inputToken} \u2192 ${outputToken} right now. Try a smaller amount or pay with a different token.`;
            case 'SLIPPAGE_EXCEEDED':
                return `Price moved beyond the slippage tolerance. Increase slippage or reduce the amount.`;
            case 'AMOUNT_BELOW_MIN': {
                const min = err.minAmount ? `${err.minAmount} ${inputToken}` : 'the per-token minimum';
                return `Amount is below ${min}. Increase the amount to continue.`;
            }
            case 'PAIR_INACTIVE':
                return `${inputToken}/${outputToken} is not currently tradeable. Choose a different input token.`;
            case 'STP_BLOCKED':
                return 'This wallet has a resting order on the opposite side of this market. Cancel it and try again.';
            case 'ALLOWANCE_INSUFFICIENT':
                return 'Token allowance is insufficient. Re-approve and retry.';
            case 'QUOTE_STALE':
            case 'INTENT_DEADLINE_EXPIRED':
                return 'Quote expired. Adjust the amount to refresh.';
            case 'TRANSIENT_SETTLEMENT_FAILURE':
                return 'Sera is temporarily unavailable. Please retry in a moment.';
        }
        return err.message;
    }
    if (err instanceof Error) return err.message;
    return 'Failed to get quote';
}

export function SwapModal({
    isOpen,
    onClose,
    defaultInputToken,
    defaultOutputToken,
    defaultAmount,
    recipientAddress,
    onSwapConfirm,
    payableTokens,
    payableLoading,
    payableError,
}: SwapModalProps) {
    const fxService = getFXService();
    const {
        address,
        connectionMethod,
        signTypedData,
        switchWallet,
        isConnecting,
    } = useWallet();

    const [inputToken, setInputToken] = useState(defaultInputToken);
    const [outputToken, setOutputToken] = useState(defaultOutputToken || 'USDC');
    const [amount, setAmount] = useState(defaultAmount);
    const [quote, setQuote] = useState<FXQuote | null>(null);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [slippageBps, setSlippageBps] = useState(50);
    const [outputTokenOptions, setOutputTokenOptions] = useState<TokenOption[]>(FALLBACK_TOKENS);
    const [allTokens, setAllTokens] = useState<TokenOption[]>(FALLBACK_TOKENS);

    // Prime tokens from Sera on open
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const { tokens } = await fxService.refreshMarkets();
                if (cancelled || tokens.length === 0) return;
                const opts = tokens.map(t => ({
                    symbol: t.symbol,
                    label: t.name || t.symbol,
                    available: true,
                }));
                setAllTokens(opts);
            } catch (e) {
                console.warn('[SwapModal] could not load Sera tokens:', e);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, fxService]);

    // Refresh output token options when input changes
    useEffect(() => {
        const available = fxService.getAvailableOutputTokens(inputToken);
        const opts = allTokens
            .filter(t => t.symbol !== inputToken)
            .map(t => ({ ...t, available: available.length === 0 ? true : available.includes(t.symbol) }));
        setOutputTokenOptions(opts);

        if (available.length > 0 && !available.includes(outputToken)) {
            setOutputToken(available[0]);
        }
    }, [inputToken, outputToken, allTokens, fxService]);

    // Keep the output token pinned to the merchant's chosen currency. The
    // payer selects the input side only.
    useEffect(() => {
        if (defaultOutputToken && outputToken !== defaultOutputToken) {
            setOutputToken(defaultOutputToken);
        }
    }, [defaultOutputToken, outputToken]);

    // If the payer's selected input token matches the merchant's output
    // token, Sera rejects the quote ("Invalid request"). Auto-bump to the
    // first available alternative.
    useEffect(() => {
        if (!inputToken || !outputToken) return;
        if (inputToken.toUpperCase() !== outputToken.toUpperCase()) return;
        const alt = allTokens.find(t => t.symbol.toUpperCase() !== outputToken.toUpperCase());
        if (alt) setInputToken(alt.symbol);
    }, [inputToken, outputToken, allTokens]);

    const isEoaWallet = connectionMethod === 'injected' || connectionMethod === 'walletconnect';
    const needsWalletSwitch = isOpen && !isEoaWallet;

    // Debounced quote fetch
    useEffect(() => {
        if (!isOpen || !inputToken || !outputToken || !amount || !address || !recipientAddress) return;
        if (!isEoaWallet) {
            setQuote(null);
            return;
        }
        // Same-token "swap" is a direct transfer; skip the quote call.
        if (inputToken.toUpperCase() === outputToken.toUpperCase()) {
            setQuote(null);
            setError(null);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            // Per Sera docs, SLIPPAGE_EXCEEDED is the only quote-time failure
            // that benefits from widening slippage. NO_LIQUIDITY explicitly
            // does not. QUOTE_STALE / INTENT_DEADLINE_EXPIRED warrant a silent
            // re-quote (the underlying snapshot just rolled).
            const slippageLadder = [slippageBps, 200, 500].filter(
                (v, i, arr) => v >= slippageBps && arr.indexOf(v) === i,
            );
            let lastErr: unknown = null;
            for (const bps of slippageLadder) {
                if (cancelled) return;
                try {
                    setLoading(true);
                    setError(null);
                    const newQuote = await fxService.getQuote(
                        inputToken,
                        outputToken,
                        amount,
                        address,
                        recipientAddress,
                        bps,
                    );
                    if (!cancelled) {
                        setQuote(newQuote);
                        setError(null);
                    }
                    return;
                } catch (err) {
                    lastErr = err;
                    if (err instanceof FXError) {
                        if (err.code === 'SLIPPAGE_EXCEEDED' && bps < 500) {
                            continue; // try next slippage tier
                        }
                        if (err.code === 'QUOTE_STALE' || err.code === 'INTENT_DEADLINE_EXPIRED') {
                            // single silent retry with same slippage
                            try {
                                const retry = await fxService.getQuote(
                                    inputToken,
                                    outputToken,
                                    amount,
                                    address,
                                    recipientAddress,
                                    bps,
                                );
                                if (!cancelled) {
                                    setQuote(retry);
                                    setError(null);
                                }
                                return;
                            } catch (retryErr) {
                                lastErr = retryErr;
                            }
                        }
                    }
                    break;
                } finally {
                    if (!cancelled) setLoading(false);
                }
            }
            if (!cancelled) {
                setQuote(null);
                setError(formatQuoteError(lastErr, inputToken, outputToken));
            }
        }, 500);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isOpen, inputToken, outputToken, amount, slippageBps, address, recipientAddress, isEoaWallet, fxService]);

    const handleSwitchWallet = async (method: 'injected' | 'walletconnect') => {
        setError(null);
        try {
            await switchWallet(method);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to switch wallet');
        }
    };

    const handleConfirm = async () => {
        if (!quote) return;
        try {
            setExecuting(true);
            setError(null);

            // 1) Sign Intent
            const intentSig = await signTypedData(
                quote.intentDomain,
                quote.intentTypes,
                quote.intentMessage,
            );

            // 2) Sign permit if Sera requested one
            let permitSig: string | undefined;
            let permitDeadline: number | undefined;
            if (quote.permit) {
                permitSig = await signTypedData(
                    quote.permit.eip712.domain,
                    quote.permit.eip712.types,
                    quote.permit.eip712.message as Record<string, unknown>,
                );
                permitDeadline = Number(quote.permit.eip712.message.deadline);
            }

            // 3) Execute via Sera. If Sera returns QUOTE_STALE (race vs another
            // swap from this wallet), the docs prescribe a silent re-quote +
            // re-sign + re-submit. Re-signing is unavoidable because the new
            // quote has a fresh uuid.
            let result = await fxService.executeSwap({
                quote,
                signature: intentSig,
                permitSignature: permitSig,
                permitDeadline,
            });

            if (!result.success && result.errorCode === 'QUOTE_STALE') {
                const fresh = await fxService.getQuote(
                    quote.inputToken,
                    quote.outputToken,
                    quote.inputAmount,
                    address!,
                    recipientAddress,
                    quote.slippageBps,
                );
                const freshIntentSig = await signTypedData(
                    fresh.intentDomain,
                    fresh.intentTypes,
                    fresh.intentMessage,
                );
                let freshPermitSig: string | undefined;
                let freshPermitDeadline: number | undefined;
                if (fresh.permit) {
                    freshPermitSig = await signTypedData(
                        fresh.permit.eip712.domain,
                        fresh.permit.eip712.types,
                        fresh.permit.eip712.message as Record<string, unknown>,
                    );
                    freshPermitDeadline = Number(fresh.permit.eip712.message.deadline);
                }
                result = await fxService.executeSwap({
                    quote: fresh,
                    signature: freshIntentSig,
                    permitSignature: freshPermitSig,
                    permitDeadline: freshPermitDeadline,
                });
                if (result.success) {
                    await onSwapConfirm({ ...result, quote: fresh });
                    onClose();
                    return;
                }
            }

            if (!result.success) {
                throw new Error(
                    formatQuoteError(
                        new FXError(result.error || 'Swap execution failed', {
                            code: result.errorCode,
                        }),
                        quote.inputToken,
                        quote.outputToken,
                    ),
                );
            }

            await onSwapConfirm({ ...result, quote });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Swap failed');
        } finally {
            setExecuting(false);
        }
    };

    const busy = loading || executing || isConnecting;

    // The merchant's chosen currency is fixed; only the input side is
    // selectable by the payer. Default to USDC if the merchant didn't set one.
    const lockedOutputToken = (defaultOutputToken || 'USDC').toUpperCase();

    // Input options. When the parent has precomputed a payable-tokens list
    // (Sera batch-quote already filtered out NO_LIQUIDITY / INSUFFICIENT
    // balance), we restrict the picker to those symbols and surface min-output
    // previews. Otherwise we fall back to the full discovered token universe.
    const payableBySymbol = useMemo(() => {
        const m = new Map<string, PayableTokenRow>();
        if (payableTokens) {
            for (const row of payableTokens) {
                if (!row.sufficient_balance) continue;
                m.set(row.symbol.toUpperCase(), row);
            }
        }
        return m;
    }, [payableTokens]);

    const inputTokens = useMemo(() => {
        if (payableTokens) {
            return [...payableBySymbol.values()].map(row => ({
                symbol: row.symbol,
                label: `${row.from_amount} ${row.symbol}`,
                available: true,
            }));
        }
        return allTokens.filter(t => t.symbol.toUpperCase() !== lockedOutputToken);
    }, [payableTokens, payableBySymbol, allTokens, lockedOutputToken]);

    // Auto-select the first payable token when the precompute lands and the
    // current `inputToken` isn't in the filtered list.
    useEffect(() => {
        if (!payableTokens || payableTokens.length === 0) return;
        if (payableBySymbol.has(inputToken.toUpperCase())) return;
        const first = inputTokens[0];
        if (first) setInputToken(first.symbol);
    }, [payableTokens, payableBySymbol, inputTokens, inputToken]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900">Choose Payment Currency</h2>
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                    {needsWalletSwitch && (
                        <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 space-y-3">
                            <div className="flex gap-2">
                                <WalletCards className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    Multi-currency swaps require an EIP-712 wallet (MetaMask, WalletConnect, etc.).
                                    Your passkey wallet will stay connected — you can switch back after this payment.
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleSwitchWallet('injected')}
                                    disabled={isConnecting}
                                    className="flex-1"
                                >
                                    Use browser wallet
                                </Button>
                                <Button
                                    onClick={() => handleSwitchWallet('walletconnect')}
                                    disabled={isConnecting}
                                    className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
                                >
                                    WalletConnect
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Input Token */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">I want to pay with</label>
                        {payableLoading && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 text-sm text-slate-600">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                Checking which of your tokens can settle this invoice…
                            </div>
                        )}
                        {!payableLoading && payableError && (
                            <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{payableError}</span>
                            </div>
                        )}
                        {!payableLoading && payableTokens && payableTokens.length === 0 && (
                            <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    No tokens in your wallet can currently route to {lockedOutputToken} on Sera.
                                    Top up {lockedOutputToken} directly to pay this invoice.
                                </span>
                            </div>
                        )}
                        {!payableLoading && inputTokens.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                {inputTokens.map(token => (
                                    <button
                                        key={token.symbol}
                                        onClick={() => setInputToken(token.symbol)}
                                        className={`p-3 rounded-lg font-medium text-sm transition-colors ${inputToken === token.symbol
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                    >
                                        {token.symbol}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center py-2">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ArrowRight className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>

                    {/* Output Token (locked to merchant's selection) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Merchant receives</label>
                        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm">
                            {lockedOutputToken}
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full px-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Slippage */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Slippage Tolerance</label>
                        <div className="flex gap-2">
                            {[25, 50, 100].map(bps => (
                                <button
                                    key={bps}
                                    onClick={() => setSlippageBps(bps)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${slippageBps === bps
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                >
                                    {(bps / 100).toFixed(2)}%
                                </button>
                            ))}
                            <input
                                type="number"
                                min="0"
                                max="10000"
                                value={slippageBps}
                                onChange={e => setSlippageBps(Number(e.target.value))}
                                className="flex-1 px-2 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                                placeholder="bps"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    {loading && (
                        <div className="flex items-center justify-center py-4 bg-slate-50 rounded-lg">
                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin mr-2" />
                            <span className="text-sm text-slate-600">Getting Sera quote…</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-red-700">{error}</div>
                        </div>
                    )}

                    {quote && !loading && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">You pay</span>
                                <span className="font-semibold text-slate-900">
                                    {quote.inputAmount} {quote.inputToken}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Merchant receives (min)</span>
                                <span className="font-semibold text-emerald-600">
                                    {quote.minOutput} {quote.outputToken}
                                </span>
                            </div>
                            {quote.feeBreakdown?.total_fee && (
                                <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-emerald-200">
                                    <span>Sera fee</span>
                                    <span>{quote.feeBreakdown.total_fee}</span>
                                </div>
                            )}
                            <div className="text-xs text-slate-500 pt-2 border-t border-emerald-200">
                                Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
                    <Button
                        onClick={onClose}
                        disabled={busy}
                        className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={busy || !quote || needsWalletSwitch}
                        className="flex-1"
                    >
                        {executing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Signing & swapping
                            </>
                        ) : (
                            'Sign & swap'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
