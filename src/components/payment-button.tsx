'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { isAddress, ZeroAddress } from 'ethers';
import { Fingerprint, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface PaymentButtonProps {
  to: string;
  amount: string;
  token?: string;
  label?: string;
  description?: string;
  onSuccess?: (result: { txHash: string }) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

type PaymentState = 'idle' | 'preparing' | 'confirming' | 'success' | 'error';

export function PaymentButton({
  to,
  amount,
  token,
  label = 'Pay',
  description,
  onSuccess,
  onError,
  disabled = false,
  className = '',
}: PaymentButtonProps) {
  const { isConnected, preparePayment, confirmPayment } = useWallet();
  const [state, setState] = useState<PaymentState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = useCallback(async () => {
    if (!isConnected || disabled) return;

    // Validate recipient address
    if (!isAddress(to) || to === ZeroAddress) {
      const msg = !isAddress(to)
        ? 'Invalid recipient address format'
        : 'Cannot send to the zero address';
      setError(msg);
      setState('error');
      onError?.(new Error(msg));
      return;
    }

    setError(null);
    setState('preparing');

    try {
      // Step 1: Prepare and sign the transfer (prompts for biometric)
      const { transferId } = await preparePayment(to, amount, token);

      setState('confirming');

      // Step 2: Execute the signed transfer
      const result = await confirmPayment(transferId);

      let finalTxHash = result.txHash;

      // Poll for final tx hash if using passkeys
      if (result.sequence) {
        try {
          const { pollForTransactionCompletion } = await import('@/lib/veridex-client');
          const completion = await pollForTransactionCompletion(result.sequence, {
            maxAttempts: 40,
            intervalMs: 3000,
            type: 'sequence'
          });

          if (completion.found && completion.status === 'completed' && completion.targetTxHash) {
            finalTxHash = completion.targetTxHash;
          } else if (completion.found && completion.status === 'failed') {
            throw new Error(completion.errorMessage || 'Transaction failed on network');
          }
        } catch (pollError) {
          console.warn('Polling failed, falling back to hub hash:', pollError);
        }
      }

      setTxHash(finalTxHash);
      setState('success');
      onSuccess?.({ txHash: finalTxHash });

      // Reset after 3 seconds
      setTimeout(() => {
        setState('idle');
        setTxHash(null);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(message));

      // Reset after 3 seconds
      setTimeout(() => {
        setState('idle');
        setError(null);
      }, 3000);
    }
  }, [isConnected, disabled, preparePayment, confirmPayment, to, amount, token, onSuccess, onError]);

  // Determine button content based on state
  const getButtonContent = () => {
    switch (state) {
      case 'preparing':
        return (
          <>
            <Fingerprint className="w-6 h-6 animate-pulse" />
            <div className="text-left">
              <div className="font-semibold">Confirm with Passkey</div>
              <div className="text-sm opacity-80">Touch to authorize</div>
            </div>
          </>
        );
      case 'confirming':
        return (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <div className="text-left">
              <div className="font-semibold">Processing...</div>
              <div className="text-sm opacity-80">Submitting transaction</div>
            </div>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="w-6 h-6" />
            <div className="text-left">
              <div className="font-semibold">Payment Sent!</div>
              {txHash && (
                <div className="text-sm opacity-80 flex items-center gap-1">
                  {txHash.slice(0, 8)}...{txHash.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </div>
              )}
            </div>
          </>
        );
      case 'error':
        return (
          <>
            <XCircle className="w-6 h-6" />
            <div className="text-left">
              <div className="font-semibold">Payment Failed</div>
              <div className="text-sm opacity-80">{error || 'Try again'}</div>
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold">{label}</div>
              {description && <div className="text-sm opacity-80">{description}</div>}
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{amount}</div>
              <div className="text-sm opacity-80">{token || 'ETH'}</div>
            </div>
          </>
        );
    }
  };

  const getButtonStyles = () => {
    const baseStyles = 'w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 transform';

    switch (state) {
      case 'success':
        return `${baseStyles} bg-gradient-to-r from-green-500 to-emerald-600 text-white`;
      case 'error':
        return `${baseStyles} bg-gradient-to-r from-red-500 to-rose-600 text-white`;
      case 'preparing':
      case 'confirming':
        return `${baseStyles} bg-gradient-to-r from-indigo-500 to-purple-600 text-white cursor-wait`;
      default:
        return `${baseStyles} bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`;
    }
  };

  if (!isConnected) {
    return (
      <div className={`w-full p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-center ${className}`}>
        Connect wallet to make payments
      </div>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || state !== 'idle'}
      className={`${getButtonStyles()} ${className}`}
    >
      {getButtonContent()}
    </button>
  );
}

/**
 * Quick Pay - Even simpler one-tap payment
 * Just shows amount and fingerprint icon
 */
interface QuickPayProps {
  to: string;
  amount: string;
  token?: string;
  onSuccess?: (result: { txHash: string }) => void;
  onError?: (error: Error) => void;
}

export function QuickPay({ to, amount, token, onSuccess, onError }: QuickPayProps) {
  const { isConnected, preparePayment, confirmPayment } = useWallet();
  const [state, setState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleQuickPay = async () => {
    if (!isConnected) return;

    setState('processing');
    try {
      const { transferId } = await preparePayment(to, amount, token);
      const result = await confirmPayment(transferId);

      let finalTxHash = result.txHash;
      if (result.sequence) {
        try {
          const { pollForTransactionCompletion } = await import('@/lib/veridex-client');
          const completion = await pollForTransactionCompletion(result.sequence, {
            maxAttempts: 40,
            intervalMs: 3000,
            type: 'sequence'
          });

          if (completion.found && completion.status === 'completed' && completion.targetTxHash) {
            finalTxHash = completion.targetTxHash;
          } else if (completion.found && completion.status === 'failed') {
            throw new Error(completion.errorMessage || 'Transaction failed on network');
          }
        } catch (pollError) {
          console.warn('Polling failed, falling back to hub hash:', pollError);
        }
      }

      setState('success');
      onSuccess?.({ txHash: finalTxHash });
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setState('error');
      onError?.(err instanceof Error ? err : new Error('Payment failed'));
      setTimeout(() => setState('idle'), 2000);
    }
  };

  const icons = {
    idle: <Fingerprint className="w-8 h-8" />,
    processing: <Loader2 className="w-8 h-8 animate-spin" />,
    success: <CheckCircle className="w-8 h-8" />,
    error: <XCircle className="w-8 h-8" />,
  };

  const colors = {
    idle: 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
    processing: 'from-indigo-500 to-purple-600',
    success: 'from-green-500 to-emerald-600',
    error: 'from-red-500 to-rose-600',
  };

  return (
    <button
      onClick={handleQuickPay}
      disabled={!isConnected || state !== 'idle'}
      className={`
        flex flex-col items-center justify-center gap-2 p-6 rounded-3xl
        bg-gradient-to-br ${colors[state]}
        text-white shadow-xl
        transition-all duration-300 transform
        hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
      `}
    >
      {icons[state]}
      <span className="font-bold text-xl">{amount}</span>
      <span className="text-sm opacity-80">{token || 'ETH'}</span>
    </button>
  );
}

export default PaymentButton;
