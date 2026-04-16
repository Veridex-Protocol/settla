'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mx-auto mb-6" />
        <h1 className="text-xl font-semibold text-white mb-2">
          Preparing your signup...
        </h1>
        <p className="text-zinc-400">
          You&apos;ll be redirected shortly.
        </p>
      </div>
    </div>
  );
}

/**
 * Signup content - handles referral code and redirects to login
 */
function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  useEffect(() => {
    // Store referral code in localStorage if present
    if (refCode) {
      localStorage.setItem('referralCode', refCode);
      // Also store timestamp for expiry (7 days)
      localStorage.setItem('referralCodeTimestamp', Date.now().toString());
    }

    // Build redirect URL
    const params = new URLSearchParams();
    params.set('mode', 'register'); // Pre-select registration mode
    if (refCode) {
      params.set('ref', refCode);
    }

    // Redirect to login page
    router.replace(`/login?${params.toString()}`);
  }, [refCode, router]);

  return <LoadingSpinner />;
}

/**
 * Signup page - redirects to login with referral code preserved
 * This handles referral links like /signup?ref=ABC123
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SignupContent />
    </Suspense>
  );
}
