'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea } from '@/components/ui';
import { XMarkIcon, LinkIcon, QrCodeIcon } from '@heroicons/react/24/outline';

const currencies = [
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'EURC', name: 'Euro Coin' },
  { symbol: 'XSGD', name: 'Singapore Dollar' },
  { symbol: 'GBPA', name: 'British Pound' },
  { symbol: 'JPYC', name: 'Japanese Yen' },
];

export default function NewPaymentLinkPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USDC',
    description: '',
    maxUses: '',
    expiresIn: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a random short code
    const shortCode = Math.random().toString(36).substring(2, 8);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setGeneratedLink(`${baseUrl}/pay/${shortCode}`);
    
    setIsLoading(false);
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
    }
  };

  if (generatedLink) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <LinkIcon className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Payment Link Created!</h1>
          <p className="text-zinc-400 mb-8">Share this link with your customer to receive payment</p>
          
          <div className="bg-zinc-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-zinc-400 mb-2">Your payment link:</p>
            <p className="text-lg font-mono text-emerald-400 break-all">{generatedLink}</p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button variant="default" onClick={copyLink}>
              Copy Link
            </Button>
            <Button variant="outline">
              <QrCodeIcon className="h-4 w-4" />
              Show QR Code
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-800">
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" onClick={() => setGeneratedLink(null)}>
                Create Another
              </Button>
              <Button variant="ghost" onClick={() => router.push('/dashboard/payments')}>
                Back to Payment Links
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Create Payment Link</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generate a shareable link to accept payments
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          <XMarkIcon className="h-4 w-4" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {currencies.map(c => (
                    <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Description"
              placeholder="What is this payment for?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Max Uses (optional)"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                />
                <p className="mt-1 text-xs text-zinc-500">Leave empty for unlimited uses</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Expires In (optional)
                </label>
                <select
                  value={formData.expiresIn}
                  onChange={(e) => setFormData({ ...formData, expiresIn: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Never expires</option>
                  <option value="1h">1 hour</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 bg-zinc-800 border-zinc-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">You will receive</p>
              <p className="text-2xl font-semibold text-white mt-1">
                {formData.amount || '0.00'} {formData.currency}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Network fees paid by payer</p>
            </div>
            <Button type="submit" variant="default" size="lg" loading={isLoading}>
              <LinkIcon className="h-4 w-4" />
              Generate Link
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
