import { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding";

export const metadata: Metadata = {
  title: "Merchant Onboarding | Sera",
  description: "Set up your Sera merchant account to start accepting stablecoin payments",
};

export default function OnboardingPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Get Started with Sera
        </h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
          Set up your merchant account in just a few minutes
        </p>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard />
    </div>
  );
}
