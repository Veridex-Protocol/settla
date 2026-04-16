export type CurrentStep = 1 | 2 | 3 | 4;

export interface OnboardingData {
    // Wallet
    walletAddress: string;
    hubAddress: string;
    keyHash: string;

    // Business Details
    name: string;
    email: string;
    industry: string;
    website: string;

    // Verification
    businessType: 'individual' | 'company';
    country: string;
    taxId: string;
}

export const initialOnboardingData: OnboardingData = {
    walletAddress: '',
    hubAddress: '',
    keyHash: '',
    name: '',
    email: '',
    industry: '',
    website: '',
    businessType: 'company',
    country: '',
    taxId: '',
};

export const INDUSTRIES = [
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'saas', label: 'SaaS / Software' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'defi', label: 'DeFi / Crypto' },
    { value: 'nft', label: 'NFT / Digital Art' },
    { value: 'services', label: 'Professional Services' },
    { value: 'other', label: 'Other' },
];

export const COUNTRIES = [
    { value: 'US', label: 'United States' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'SG', label: 'Singapore' },
    { value: 'JP', label: 'Japan' },
    { value: 'AU', label: 'Australia' },
    { value: 'CA', label: 'Canada' },
    { value: 'OTHER', label: 'Other' },
];
