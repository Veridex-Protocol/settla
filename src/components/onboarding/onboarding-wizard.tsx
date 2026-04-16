"use client";

import React, { useState, useCallback } from "react";
import { StepIndicator, Step } from "./step-indicator";
import { ConnectWalletStep } from "./steps/connect-wallet-step";
import { BusinessDetailsStep, BusinessDetails } from "./steps/business-details-step";
import { VerificationStep, VerificationData } from "./steps/verification-step";
import { CompletionStep } from "./steps/completion-step";

const ONBOARDING_STEPS: Step[] = [
  {
    id: 1,
    title: "Connect Wallet",
    description: "Secure passkey auth",
  },
  {
    id: 2,
    title: "Business Details",
    description: "Tell us about you",
  },
  {
    id: 3,
    title: "Verification",
    description: "Confirm identity",
  },
  {
    id: 4,
    title: "Complete",
    description: "You're all set!",
  },
];

export interface OnboardingData {
  walletAddress: string | null;
  hubAddress?: string | null;
  keyHash?: string | null;
  businessDetails: BusinessDetails | null;
  verification: VerificationData | null;
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    walletAddress: null,
    hubAddress: null,
    keyHash: null,
    businessDetails: null,
    verification: null,
  });

  const handleWalletConnected = useCallback((address: string, hubAddress?: string, keyHash?: string) => {
    setData(prev => ({
      ...prev,
      walletAddress: address,
      hubAddress: hubAddress || null,
      keyHash: keyHash || null,
    }));
    setCurrentStep(2);
  }, []);

  const handleBusinessDetailsSubmit = useCallback((details: BusinessDetails) => {
    setData(prev => ({ ...prev, businessDetails: details }));
    setCurrentStep(3);
  }, []);

  const handleVerificationSubmit = useCallback(async (verification: VerificationData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare the onboarding data
      const onboardingPayload = {
        walletAddress: data.walletAddress,
        hubAddress: data.hubAddress,
        keyHash: data.keyHash,
        name: data.businessDetails?.businessName || '',
        email: data.businessDetails?.email || '',
        industry: data.businessDetails?.industry,
        website: data.businessDetails?.website,
        taxId: verification.businessId,
        country: verification.registrationCountry,
      };

      // Submit to the onboarding API
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete onboarding');
      }

      // Mark onboarding as complete
      await fetch('/api/onboarding/status', {
        method: 'POST',
      });

      setData(prev => ({ ...prev, verification }));
      setCurrentStep(4);
    } catch (err) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
    setError(null);
  }, [currentStep]);

  return (
    <div className="space-y-10">
      {/* Step Indicator */}
      <StepIndicator steps={ONBOARDING_STEPS} currentStep={currentStep} />

      {/* Error Display */}
      {error && (
        <div className="mx-auto max-w-md p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl p-8 shadow-xl">
        {currentStep === 1 && (
          <ConnectWalletStep
            onConnect={handleWalletConnected}
            isLoading={isLoading}
          />
        )}

        {currentStep === 2 && (
          <BusinessDetailsStep
            initialData={data.businessDetails}
            onSubmit={handleBusinessDetailsSubmit}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {currentStep === 3 && (
          <VerificationStep
            initialData={data.verification}
            onSubmit={handleVerificationSubmit}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}

        {currentStep === 4 && (
          <CompletionStep
            data={data}
          />
        )}
      </div>
    </div>
  );
}
