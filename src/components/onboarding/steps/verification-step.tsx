"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
  HelpCircle,
  AlertCircle,
  Building,
  MapPin,
} from "lucide-react";
import { Button, Input } from "@/components/ui";

export interface VerificationData {
  businessId: string;
  registrationCountry: string;
  acceptedTerms: boolean;
}

interface VerificationStepProps {
  initialData: VerificationData | null;
  onSubmit: (data: VerificationData) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const COUNTRIES = [
  { value: '', label: 'Select country of registration' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'AU', label: 'Australia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'OTHER', label: 'Other' },
];

export function VerificationStep({ 
  initialData, 
  onSubmit, 
  onBack, 
  isLoading 
}: VerificationStepProps) {
  const [formData, setFormData] = useState<VerificationData>({
    businessId: initialData?.businessId || '',
    registrationCountry: initialData?.registrationCountry || '',
    acceptedTerms: initialData?.acceptedTerms || false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VerificationData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof VerificationData, string>> = {};

    if (!formData.businessId.trim()) {
      newErrors.businessId = 'Business ID is required';
    } else if (formData.businessId.length < 5) {
      newErrors.businessId = 'Please enter a valid business registration number';
    }

    if (!formData.registrationCountry) {
      newErrors.registrationCountry = 'Please select your country of registration';
    }

    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = 'You must accept the terms to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/25">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Verify Your Business
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Quick verification to ensure secure transactions for you and your customers
        </p>
      </div>

      {/* Why We Need This */}
      <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-medium text-amber-900 dark:text-amber-200">
              Why do we need this?
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Business verification (KYB) helps prevent fraud, ensures compliance with financial regulations, 
              and builds trust with your customers. This is a simplified verification — full KYB can be 
              completed later for higher transaction limits.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Registration ID */}
        <div>
          <label className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Building className="mr-2 h-4 w-4 text-slate-400" />
            Business Registration Number
            <span className="ml-1 text-red-500">*</span>
            <div className="relative ml-1 inline-block">
              <HelpCircle className="h-4 w-4 text-slate-400" />
            </div>
          </label>
          <Input
            placeholder="e.g., EIN, Company Number, SIRET, etc."
            value={formData.businessId}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, businessId: e.target.value }));
              if (errors.businessId) setErrors(prev => ({ ...prev, businessId: undefined }));
            }}
            className={errors.businessId ? 'border-red-500 focus:ring-red-500' : ''}
          />
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Enter your official business registration number from your country (EIN for US, Company Number for UK, etc.)
          </p>
          {errors.businessId && (
            <p className="mt-1.5 text-sm text-red-500">{errors.businessId}</p>
          )}
        </div>

        {/* Country of Registration */}
        <div>
          <label className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <MapPin className="mr-2 h-4 w-4 text-slate-400" />
            Country of Registration
            <span className="ml-1 text-red-500">*</span>
          </label>
          <select
            value={formData.registrationCountry}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, registrationCountry: e.target.value }));
              if (errors.registrationCountry) setErrors(prev => ({ ...prev, registrationCountry: undefined }));
            }}
            className={`
              w-full rounded-xl border bg-white px-4 py-3 text-slate-900 
              shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
              dark:border-slate-700 dark:bg-slate-800 dark:text-white
              ${errors.registrationCountry ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-300'}
            `}
          >
            {COUNTRIES.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
          {errors.registrationCountry && (
            <p className="mt-1.5 text-sm text-red-500">{errors.registrationCountry}</p>
          )}
        </div>

        {/* Terms & Conditions */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={formData.acceptedTerms}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, acceptedTerms: e.target.checked }));
                if (errors.acceptedTerms) setErrors(prev => ({ ...prev, acceptedTerms: undefined }));
              }}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
            />
            <div>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                I confirm that the information provided is accurate and I accept the{' '}
                <a href="/terms" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  Privacy Policy
                </a>
              </span>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                By continuing, you authorize Sera to verify your business information with third-party services.
              </p>
            </div>
          </label>
          {errors.acceptedTerms && (
            <p className="mt-2 text-sm text-red-500">{errors.acceptedTerms}</p>
          )}
        </div>

        {/* Placeholder Notice */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-100/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <FileText className="h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong className="text-slate-700 dark:text-slate-300">Note:</strong> This is a simplified verification. 
              For production, we'll integrate with KYB providers like Persona, Onfido, or Sumsub 
              for comprehensive business verification.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            type="submit"
            className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ArrowRight className="h-5 w-5" />
                Complete Verification
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
