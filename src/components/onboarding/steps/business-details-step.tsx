"use client";

import React, { useState } from "react";
import { 
  Building2, 
  Mail, 
  Briefcase,
  ArrowLeft,
  ArrowRight,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Button, Input } from "@/components/ui";

export interface BusinessDetails {
  businessName: string;
  email: string;
  industry: string;
  website?: string;
}

interface BusinessDetailsStepProps {
  initialData: BusinessDetails | null;
  onSubmit: (data: BusinessDetails) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const INDUSTRIES = [
  { value: '', label: 'Select your industry' },
  { value: 'ecommerce', label: 'E-Commerce & Retail' },
  { value: 'saas', label: 'SaaS & Software' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'gaming', label: 'Gaming & Entertainment' },
  { value: 'defi', label: 'DeFi & Crypto' },
  { value: 'nft', label: 'NFT & Digital Collectibles' },
  { value: 'fintech', label: 'Fintech & Payments' },
  { value: 'creator', label: 'Creator Economy' },
  { value: 'consulting', label: 'Consulting & Services' },
  { value: 'other', label: 'Other' },
];

interface FieldTooltipProps {
  content: string;
}

function FieldTooltip({ content }: FieldTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 p-3 text-sm text-white shadow-lg dark:bg-slate-700">
          {content}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
        </div>
      )}
    </div>
  );
}

export function BusinessDetailsStep({ 
  initialData, 
  onSubmit, 
  onBack, 
  isLoading 
}: BusinessDetailsStepProps) {
  const [formData, setFormData] = useState<BusinessDetails>({
    businessName: initialData?.businessName || '',
    email: initialData?.email || '',
    industry: initialData?.industry || '',
    website: initialData?.website || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BusinessDetails, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BusinessDetails, string>> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    } else if (formData.businessName.length < 2) {
      newErrors.businessName = 'Business name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.industry) {
      newErrors.industry = 'Please select an industry';
    }

    if (formData.website && !/^https?:\/\/.+\..+/.test(formData.website)) {
      newErrors.website = 'Please enter a valid URL (https://...)';
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

  const updateField = (field: keyof BusinessDetails, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/25">
          <Building2 className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Tell Us About Your Business
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          This information helps us customize your payment experience
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Name */}
        <div>
          <label className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Building2 className="mr-2 h-4 w-4 text-slate-400" />
            Business Name
            <span className="ml-1 text-red-500">*</span>
            <FieldTooltip content="The name customers will see on invoices and payment requests. Use your legal business name or DBA." />
          </label>
          <Input
            placeholder="Acme Corporation"
            value={formData.businessName}
            onChange={(e) => updateField('businessName', e.target.value)}
            className={errors.businessName ? 'border-red-500 focus:ring-red-500' : ''}
          />
          {errors.businessName && (
            <p className="mt-1.5 text-sm text-red-500">{errors.businessName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Mail className="mr-2 h-4 w-4 text-slate-400" />
            Business Email
            <span className="ml-1 text-red-500">*</span>
            <FieldTooltip content="We'll send payment notifications, receipts, and important updates to this email. Use your primary business email." />
          </label>
          <Input
            type="email"
            placeholder="hello@acme.com"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={errors.email ? 'border-red-500 focus:ring-red-500' : ''}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <Briefcase className="mr-2 h-4 w-4 text-slate-400" />
            Industry
            <span className="ml-1 text-red-500">*</span>
            <FieldTooltip content="Helps us provide industry-specific features and compliance guidance. You can change this later." />
          </label>
          <select
            value={formData.industry}
            onChange={(e) => updateField('industry', e.target.value)}
            className={`
              w-full rounded-xl border bg-white px-4 py-3 text-slate-900 
              shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
              dark:border-slate-700 dark:bg-slate-800 dark:text-white
              ${errors.industry ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-300'}
            `}
          >
            {INDUSTRIES.map((industry) => (
              <option key={industry.value} value={industry.value}>
                {industry.label}
              </option>
            ))}
          </select>
          {errors.industry && (
            <p className="mt-1.5 text-sm text-red-500">{errors.industry}</p>
          )}
        </div>

        {/* Website (Optional) */}
        <div>
          <label className="mb-2 flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <span className="mr-2 text-slate-400">🌐</span>
            Website
            <span className="ml-1 text-slate-400">(optional)</span>
            <FieldTooltip content="Your company website. This may be displayed on invoices and helps with verification." />
          </label>
          <Input
            type="url"
            placeholder="https://acme.com"
            value={formData.website}
            onChange={(e) => updateField('website', e.target.value)}
            className={errors.website ? 'border-red-500 focus:ring-red-500' : ''}
          />
          {errors.website && (
            <p className="mt-1.5 text-sm text-red-500">{errors.website}</p>
          )}
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
            className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
            {isLoading ? 'Saving...' : 'Continue to Verification'}
          </Button>
        </div>
      </form>
    </div>
  );
}
