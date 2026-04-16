'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  Fingerprint,
  Loader2,
  UserPlus,
  LogIn,
  ArrowLeft,
  Shield,
  Zap,
  Key
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useWallet } from '@/lib/wallet-context';

type AuthMode = 'select' | 'signin' | 'register';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const modeParam = searchParams.get('mode');
  const refParam = searchParams.get('ref');

  const {
    isConnected,
    isConnecting,
    passkeySupported,
    hasStoredPasskey,
    connectPasskey,
    credentialId,
    address
  } = useWallet();

  // If mode=register is passed (from /signup redirect), start in register mode
  const initialMode: AuthMode = modeParam === 'register' ? 'register' : 'select';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(refParam);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Load referral code from localStorage if not in URL params
  useEffect(() => {
    if (!referralCode) {
      const storedCode = localStorage.getItem('referralCode');
      const timestamp = localStorage.getItem('referralCodeTimestamp');
      if (storedCode && timestamp) {
        // Check if referral code is still valid (7 days)
        const age = Date.now() - parseInt(timestamp);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (age < sevenDays) {
          setReferralCode(storedCode);
        } else {
          // Expired, clean up
          localStorage.removeItem('referralCode');
          localStorage.removeItem('referralCodeTimestamp');
        }
      }
    }
  }, [referralCode]);

  // After successful passkey auth, create NextAuth session and redirect
  useEffect(() => {
    if (isConnected && address && credentialId && !isCreatingSession) {
      createSessionAndRedirect();
    }
  }, [isConnected, address, credentialId]);

  const createSessionAndRedirect = async () => {
    setIsCreatingSession(true);
    try {
      // Create NextAuth session with the passkey credentials
      const result = await signIn('credentials', {
        redirect: false,
        credentialId: credentialId,
        userHandle: address, // Use wallet address as user handle
        referralCode: referralCode || undefined, // Pass referral code if present
      });

      if (result?.error) {
        console.log('NextAuth session creation failed, redirecting anyway:', result.error);
        // Even if NextAuth fails, we still have wallet auth - continue to dashboard
      }

      // Clear referral code from localStorage after successful signup
      if (referralCode) {
        localStorage.removeItem('referralCode');
        localStorage.removeItem('referralCodeTimestamp');
      }

      router.push(callbackUrl);
    } catch (err) {
      console.error('Session creation error:', err);
      // Still redirect to dashboard since wallet auth succeeded
      router.push(callbackUrl);
    }
  };

  const handleSignIn = async () => {
    setError(null);
    try {
      await connectPasskey('authenticate');
      // useEffect will handle session creation and redirect
    } catch (err) {
      console.error('Failed to sign in:', err);
      setError('Failed to authenticate. Make sure you have a registered passkey on this device.');
    }
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      setError('Please enter your business name or email');
      return;
    }
    setError(null);
    try {
      await connectPasskey('register', username.trim());
      // useEffect will handle session creation and redirect
    } catch (err) {
      console.error('Failed to register:', err);
      setError('Failed to create passkey. Please make sure your device supports passkeys.');
    }
  };

  // If passkeys aren't supported, show a message
  if (!passkeySupported) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-900/20 border border-red-800">
            <Shield className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-4">
            Passkeys Not Supported
          </h1>
          <p className="text-zinc-400 mb-8">
            Your browser or device doesn't support passkeys. Please try using a
            modern browser like Chrome, Safari, or Edge on a device with biometric
            authentication (Face ID, Touch ID, Windows Hello).
          </p>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300" suppressHydrationWarning>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Loading state while creating session
  if (isCreatingSession) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-white mb-2">
            Setting up your session...
          </h1>
          <p className="text-zinc-400">
            You'll be redirected to your dashboard shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <span className="text-zinc-900 font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-semibold text-white">Settla</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mode Selection */}
          {mode === 'select' && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-700/50">
                <Fingerprint className="h-10 w-10 text-emerald-400" />
              </div>

              <h1 className="text-2xl font-semibold text-white mb-2">
                Welcome to Settla
              </h1>
              <p className="text-zinc-400 mb-8">
                Secure, passwordless authentication with passkeys
              </p>

              <div className="space-y-4">
                {hasStoredPasskey && (
                  <Button
                    size="lg"
                    className="w-full gap-3 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSignIn}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <LogIn className="h-5 w-5" />
                    )}
                    {isConnecting ? 'Authenticating...' : 'Sign in with Passkey'}
                  </Button>
                )}

                <Button
                  size="lg"
                  variant={hasStoredPasskey ? 'outline' : 'default'}
                  className={`w-full gap-3 ${!hasStoredPasskey ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                  onClick={() => setMode('register')}
                  disabled={isConnecting}
                >
                  <UserPlus className="h-5 w-5" />
                  Create New Account
                </Button>

                {!hasStoredPasskey && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full gap-3 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setMode('signin')}
                    disabled={isConnecting}
                  >
                    <Key className="h-5 w-5" />
                    I have a passkey on this device
                  </Button>
                )}
              </div>

              {error && (
                <div className="mt-6 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Features */}
              <div className="mt-12 grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <Shield className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Passwordless</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <Zap className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Instant</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <Fingerprint className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Biometric</p>
                </div>
              </div>
            </div>
          )}

          {/* Sign In Mode */}
          {mode === 'signin' && (
            <div className="text-center">
              <button
                onClick={() => { setMode('select'); setError(null); }}
                className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-700/50">
                <LogIn className="h-10 w-10 text-indigo-400" />
              </div>

              <h1 className="text-2xl font-semibold text-white mb-2">
                Sign In
              </h1>
              <p className="text-zinc-400 mb-8">
                Use your passkey to access your account
              </p>

              <Button
                size="lg"
                className="w-full gap-3 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSignIn}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Fingerprint className="h-5 w-5" />
                )}
                {isConnecting ? 'Authenticating...' : 'Authenticate with Passkey'}
              </Button>

              {error && (
                <div className="mt-6 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <p className="mt-8 text-sm text-zinc-500">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Create one
                </button>
              </p>
            </div>
          )}

          {/* Register Mode */}
          {mode === 'register' && (
            <div className="text-center">
              <button
                onClick={() => { setMode('select'); setError(null); setUsername(''); }}
                className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-700/50">
                <UserPlus className="h-10 w-10 text-emerald-400" />
              </div>

              <h1 className="text-2xl font-semibold text-white mb-2">
                Create Your Account
              </h1>
              <p className="text-zinc-400 mb-4">
                Set up your secure passkey for instant access
              </p>

              {/* Referral Code Badge */}
              {referralCode && (
                <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/30 border border-emerald-700/50 text-sm text-emerald-400">
                  <span>🎉</span>
                  <span>Referral code: <strong>{referralCode}</strong></span>
                </div>
              )}

              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Business Name or Email
                  </label>
                  <Input
                    placeholder="e.g., Acme Inc. or you@company.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    className="w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    This will be associated with your passkey credential
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-full gap-3 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleRegister}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Fingerprint className="h-5 w-5" />
                  )}
                  {isConnecting ? 'Creating Passkey...' : 'Create Passkey & Continue'}
                </Button>
              </div>

              {error && (
                <div className="mt-6 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <p className="mt-8 text-sm text-zinc-500">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-zinc-500">
          <p>
            By continuing, you agree to our{' '}
            <a href="#" className="text-zinc-400 hover:text-zinc-300" suppressHydrationWarning>Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-zinc-400 hover:text-zinc-300" suppressHydrationWarning>Privacy Policy</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-semibold text-white mb-2">
          Loading...
        </h1>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
