"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  FileText,
  CreditCard,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { OnboardingData } from "../onboarding-wizard";
import confetti from 'canvas-confetti';

interface CompletionStepProps {
  data: OnboardingData;
}

export function CompletionStep({ data }: CompletionStepProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Trigger confetti on mount
  useEffect(() => {
    // Fire confetti
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Launch from both sides
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRedirecting(true);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleGoToDashboard = () => {
    setIsRedirecting(true);
    router.push('/dashboard');
  };

  const nextSteps = [
    {
      icon: FileText,
      title: "Create Your First Invoice",
      description: "Send a professional invoice to your first customer",
      color: "text-indigo-500",
    },
    {
      icon: CreditCard,
      title: "Set Up Payment Methods",
      description: "Configure which stablecoins you accept",
      color: "text-emerald-500",
    },
    {
      icon: Users,
      title: "Invite Team Members",
      description: "Collaborate with your team on payments",
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-8 text-center">
      {/* Success Animation */}
      <div className="relative mx-auto">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/30">
          <CheckCircle2 className="h-12 w-12 text-white" />
        </div>
        <div className="absolute -inset-4 animate-pulse rounded-full bg-green-400/20" />
      </div>

      {/* Header */}
      <div>
        <div className="mb-2 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Onboarding Complete
          </span>
          <Sparkles className="h-5 w-5 text-amber-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome to Sera, {data.businessDetails?.businessName || 'Merchant'}!
        </h2>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
          Your merchant account is ready. You can now start accepting stablecoin payments.
        </p>
      </div>

      {/* Account Summary */}
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          Your Account
        </h3>
        <div className="space-y-2 text-left">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Wallet</span>
            <span className="font-mono text-sm text-slate-900 dark:text-white">
              {data.walletAddress?.slice(0, 6)}...{data.walletAddress?.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Business</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {data.businessDetails?.businessName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Industry</span>
            <span className="text-sm text-slate-900 dark:text-white">
              {data.businessDetails?.industry?.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Verified
            </span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Recommended Next Steps
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {nextSteps.map((step) => (
            <div
              key={step.title}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            >
              <step.icon className={`h-8 w-8 ${step.color}`} />
              <h4 className="mt-3 font-medium text-slate-900 dark:text-white">
                {step.title}
              </h4>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-4 pt-4">
        <Button
          size="lg"
          className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 px-8 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700"
          onClick={handleGoToDashboard}
          disabled={isRedirecting}
        >
          {isRedirecting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              Go to Dashboard
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
        
        {!isRedirecting && countdown > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Redirecting automatically in {countdown} seconds...
          </p>
        )}
      </div>
    </div>
  );
}
