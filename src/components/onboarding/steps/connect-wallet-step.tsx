"use client";

import React, { useState } from "react";
import { 
  Fingerprint, 
  Shield, 
  Zap, 
  Lock, 
  Loader2, 
  UserPlus,
  LogIn,
  Info,
  CheckCircle2,
  X
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useWallet } from "@/lib/wallet-context";

interface ConnectWalletStepProps {
  onConnect: (address: string) => void;
  isLoading?: boolean;
}

export function ConnectWalletStep({ onConnect, isLoading }: ConnectWalletStepProps) {
  const { 
    isConnected, 
    isConnecting, 
    address, 
    passkeySupported,
    hasStoredPasskey,
    connectPasskey,
  } = useWallet();

  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  // If already connected, show success and allow proceeding
  React.useEffect(() => {
    if (isConnected && address) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  const handleSignIn = async () => {
    setError(null);
    try {
      await connectPasskey('authenticate');
    } catch (err) {
      console.error('Failed to sign in:', err);
      setError('Failed to sign in. Make sure you have a registered passkey.');
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('Please enter a username or email');
      return;
    }
    setError(null);
    try {
      await connectPasskey('register', username.trim());
    } catch (err) {
      console.error('Failed to register:', err);
      setError('Failed to create passkey. Please try again.');
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Your passkey is stored securely on your device, never on our servers.",
    },
    {
      icon: Zap,
      title: "Instant Access",
      description: "Sign in instantly with Face ID, Touch ID, or your device PIN.",
    },
    {
      icon: Lock,
      title: "No Passwords",
      description: "Never remember or type a password again. Phishing-resistant by design.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-600 shadow-xl shadow-cyan-500/25">
          <Fingerprint className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Connect with Veridex
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Secure your account with a passkey — the modern replacement for passwords
        </p>
      </div>

      {/* What is a Passkey? Info Box */}
      <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/30">
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h3 className="font-medium text-cyan-900 dark:text-cyan-200">
              What is a Passkey?
            </h3>
            <p className="mt-1 text-sm text-cyan-700 dark:text-cyan-300">
              A passkey uses your device's biometrics (Face ID, Touch ID, or Windows Hello) 
              to create a cryptographic key that proves your identity. It's more secure than 
              passwords and impossible to phish.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <feature.icon className="h-8 w-8 text-cyan-500" />
            <h3 className="mt-3 font-medium text-slate-900 dark:text-white">
              {feature.title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <X className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Not Supported Warning */}
      {!passkeySupported && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <Info className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Passkeys not supported
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Your browser or device doesn't support passkeys. Please use a modern browser 
              like Chrome, Safari, or Edge on a device with biometric authentication.
            </p>
          </div>
        </div>
      )}

      {/* Connection Actions */}
      {passkeySupported && (
        <div className="space-y-4">
          {showRegisterForm ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Username or Email
                  <span className="ml-1 text-slate-400">(used to identify your passkey)</span>
                </label>
                <Input
                  placeholder="you@company.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  autoFocus
                  className="text-lg"
                />
              </div>
              
              <Button
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-emerald-700"
                onClick={handleRegister}
                disabled={isConnecting || isLoading}
              >
                {isConnecting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
                {isConnecting ? 'Creating Passkey...' : 'Create Passkey & Continue'}
              </Button>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowRegisterForm(false);
                  setError(null);
                }}
                disabled={isConnecting}
              >
                ← Back to options
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Sign In with existing passkey */}
              {hasStoredPasskey && (
                <Button
                  size="lg"
                  className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-emerald-700"
                  onClick={handleSignIn}
                  disabled={isConnecting || isLoading}
                >
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                  {isConnecting ? 'Signing In...' : 'Sign In with Passkey'}
                </Button>
              )}

              {/* Create new passkey */}
              <Button
                size="lg"
                variant={hasStoredPasskey ? "outline" : "default"}
                className={
                  hasStoredPasskey 
                    ? "w-full gap-2" 
                    : "w-full gap-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-emerald-700"
                }
                onClick={() => {
                  setShowRegisterForm(true);
                  setError(null);
                }}
                disabled={isConnecting || isLoading}
              >
                <UserPlus className="h-5 w-5" />
                {hasStoredPasskey ? 'Create New Passkey' : 'Get Started — Create Passkey'}
              </Button>

              {/* Quick sign in for users without stored passkey */}
              {!hasStoredPasskey && (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Already have a passkey?{' '}
                  <button
                    className="font-medium text-cyan-600 hover:underline dark:text-cyan-400"
                    onClick={handleSignIn}
                    disabled={isConnecting}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trust Indicators */}
      <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>256-bit encryption</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>FIDO2 certified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>On-chain security</span>
        </div>
      </div>
    </div>
  );
}
