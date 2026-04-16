'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { isWalletConnectAvailable } from '@/lib/walletconnect';
import { Button } from '@/components/ui';
import { Fingerprint, Wallet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ConnectWalletProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  variant?: 'default' | 'minimal';
}

export function ConnectWallet({ onSuccess, onError, variant = 'default' }: ConnectWalletProps) {
  const {
    isConnected,
    isConnecting,
    address,
    connectionMethod,
    passkeySupported,
    connect,
    disconnect,
    registerNewPasskey,
  } = useWallet();

  const [mode, setMode] = useState<'connect' | 'register'>('connect');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [walletConnectAvailable, setWalletConnectAvailable] = useState(false);
  const [isConnectingWC, setIsConnectingWC] = useState(false);

  // Check WalletConnect availability on mount
  useEffect(() => {
    isWalletConnectAvailable().then(setWalletConnectAvailable);
  }, []);

  const handlePasskeyConnect = async () => {
    setError(null);
    try {
      await connect('passkey');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    }
  };

  const handlePasskeyRegister = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    setError(null);
    try {
      await registerNewPasskey(username.trim());
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register passkey';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    }
  };

  // Already connected - show wallet info
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            {connectionMethod === 'walletconnect' && <Wallet className="w-3 h-3 inline mr-1" />}
            {connectionMethod === 'passkey' && <Fingerprint className="w-3 h-3 inline mr-1" />}
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  // Minimal variant - just a button
  if (variant === 'minimal') {
    return (
      <Button
        onClick={handlePasskeyConnect}
        disabled={isConnecting || !passkeySupported}
        className="gap-2"
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Fingerprint className="w-4 h-4" />
        )}
        {isConnecting ? 'Connecting...' : 'Connect with Passkey'}
      </Button>
    );
  }

  // Full connect experience
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Connect Wallet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Secure authentication with your device
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!passkeySupported && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Passkeys not supported
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Your browser doesn&apos;t support passkeys. Try Chrome, Safari, or Edge.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {mode === 'connect' ? (
            <>
              {/* Passkey Connect Button */}
              <button
                onClick={handlePasskeyConnect}
                disabled={isConnecting || !passkeySupported}
                className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed shadow-lg"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  {isConnecting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Fingerprint className="w-6 h-6" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold">
                    {isConnecting ? 'Authenticating...' : 'Connect with Passkey'}
                  </div>
                  <div className="text-sm text-white/80">
                    Touch ID, Face ID, or security key
                  </div>
                </div>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
                    or
                  </span>
                </div>
              </div>

              {/* WalletConnect Option */}
              <button
                onClick={async () => {
                  setError(null);
                  setIsConnectingWC(true);
                  try {
                    await connect('walletconnect');
                    onSuccess?.();
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to connect wallet';
                    setError(message);
                    onError?.(err instanceof Error ? err : new Error(message));
                  } finally {
                    setIsConnectingWC(false);
                  }
                }}
                disabled={isConnecting || isConnectingWC || !walletConnectAvailable}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                  walletConnectAvailable 
                    ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 hover:scale-[1.02] transform'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  walletConnectAvailable 
                    ? 'bg-blue-100 dark:bg-blue-800'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  {isConnectingWC ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Wallet className="w-6 h-6" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold">
                    {isConnectingWC ? 'Connecting...' : 'External Wallet'}
                  </div>
                  <div className="text-sm opacity-80">
                    {walletConnectAvailable 
                      ? 'MetaMask, Rainbow, Coinbase...'
                      : 'Install packages to enable'}
                  </div>
                </div>
              </button>

              {/* New user link */}
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                New to Veridex?{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Create a passkey
                </button>
              </p>
            </>
          ) : (
            <>
              {/* Registration Form */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Choose a username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alice"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    disabled={isConnecting}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    This will be associated with your passkey
                  </p>
                </div>

                <button
                  onClick={handlePasskeyRegister}
                  disabled={isConnecting || !passkeySupported || !username.trim()}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed shadow-lg font-semibold"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating passkey...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5" />
                      Create Passkey
                    </>
                  )}
                </button>
              </div>

              {/* Back to connect */}
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Already have a passkey?{' '}
                <button
                  onClick={() => setMode('connect')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Powered by <span className="font-semibold text-indigo-600 dark:text-indigo-400">Veridex Protocol</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConnectWallet;
