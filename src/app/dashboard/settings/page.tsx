"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Separator, Tabs, TabsContent, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui";
import {
  Save,
  Shield,
  Wallet,
  User,
  Bell,
  Globe,
  Building2,
  Mail,
  Fingerprint,
  Loader2,
  CheckCircle,
  Plus,
  AlertCircle,
  Coins,
  MapPin,
  Clock,
  Key,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { WalletSection } from "@/components/settings/wallet-section";
import { toast } from "sonner";

interface BusinessSettings {
  id: string;
  name: string;
  email: string;
  walletAddress: string | null;
  taxId: string | null;
  website: string | null;
  supportEmail: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  defaultCurrency: string;
  timezone: string;
  logoUrl: string | null;
  kybStatus: string;
}

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passkeyUsername, setPasskeyUsername] = useState("");
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [showAddPasskey, setShowAddPasskey] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Business settings form state
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    walletAddress: "",
    taxId: "",
    supportEmail: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    defaultCurrency: "USDC",
    timezone: "utc",
  });

  const {
    isConnected,
    address,
    passkeySupported,
    credentialId,
    registerNewPasskey,
    connect,
    disconnect
  } = useWallet();

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          setFormData({
            name: data.name || "",
            walletAddress: data.walletAddress || "",
            taxId: data.taxId || "",
            supportEmail: data.supportEmail || "",
            website: data.website || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            zipCode: data.zipCode || "",
            defaultCurrency: data.defaultCurrency || "USDC",
            timezone: data.timezone || "utc",
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        toast.success('Settings saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPasskey = async () => {
    if (!passkeyUsername.trim()) {
      setPasskeyError("Please enter a username");
      return;
    }

    setPasskeyError(null);
    setIsAddingPasskey(true);

    try {
      await registerNewPasskey(passkeyUsername.trim());
      setShowAddPasskey(false);
      setPasskeyUsername("");
    } catch (error) {
      setPasskeyError(error instanceof Error ? error.message : "Failed to register passkey");
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleConnectPasskey = async () => {
    setPasskeyError(null);
    try {
      await connect('passkey');
    } catch (error) {
      setPasskeyError(error instanceof Error ? error.message : "Failed to connect");
    }
  };

  return (
    <div className="flex flex-col mb-10">
      <Header
        title="Settings"
        description="Manage your business and account preferences"
      />

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full justify-start mb-4 sm:mb-6 bg-transparent p-0 border-b border-zinc-800 rounded-none h-auto overflow-x-auto flex-nowrap scrollbar-hide">
              <TabsTrigger
                value="general"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0 text-xs sm:text-sm"
              >
                <Building2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="wallet"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0 text-xs sm:text-sm"
              >
                <Coins className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Wallet</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0 text-xs sm:text-sm"
              >
                <Shield className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="payment"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0 text-xs sm:text-sm"
              >
                <Wallet className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Payment</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0 text-xs sm:text-sm"
              >
                <Bell className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Accordion type="multiple" defaultValue={["business", "address", "regional"]} className="space-y-4">
                {/* Business Profile Section */}
                <AccordionItem value="business" className="border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:bg-zinc-800/50 transition-colors [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">Business Profile</p>
                        <p className="text-sm text-zinc-400">Company name, tax ID, and contact info</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-4 pt-2">
                        <div className="h-20 w-20 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Building2 className="h-8 w-8 text-zinc-400" />
                        </div>
                        <Button variant="outline" size="sm">Change Logo</Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="businessName">Business Name</Label>
                          <Input
                            id="businessName"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Enter your business name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taxId">Tax ID / EIN</Label>
                          <Input
                            id="taxId"
                            value={formData.taxId}
                            onChange={(e) => handleInputChange('taxId', e.target.value)}
                            placeholder="XX-XXXXXXX"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Support Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.supportEmail}
                            onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                            placeholder="support@yourbusiness.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={formData.website}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            placeholder="https://yourbusiness.com"
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Address Section */}
                <AccordionItem value="address" className="border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:bg-zinc-800/50 transition-colors [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">Business Address</p>
                        <p className="text-sm text-zinc-400">Physical location for invoices and receipts</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          placeholder="123 Main Street"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State / Province</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            placeholder="State"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zip">ZIP / Postal Code</Label>
                          <Input
                            id="zip"
                            value={formData.zipCode}
                            onChange={(e) => handleInputChange('zipCode', e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Regional Settings Section */}
                <AccordionItem value="regional" className="border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:bg-zinc-800/50 transition-colors [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">Regional Settings</p>
                        <p className="text-sm text-zinc-400">Currency and timezone preferences</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Default Currency</Label>
                        <Select value={formData.defaultCurrency} onValueChange={(value) => handleInputChange('defaultCurrency', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USDC">USDC (USD Coin)</SelectItem>
                            <SelectItem value="EURC">EURC (Euro Coin)</SelectItem>
                            <SelectItem value="XSGD">XSGD (Singapore Dollar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="utc-8">Pacific Time (US & Canada)</SelectItem>
                            <SelectItem value="utc-5">Eastern Time (US & Canada)</SelectItem>
                            <SelectItem value="utc">UTC</SelectItem>
                            <SelectItem value="utc+1">Central European Time</SelectItem>
                            <SelectItem value="utc+8">Singapore Standard Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end">
                <Button onClick={handleSave} loading={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-6">
              <WalletSection />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Authentication Methods</CardTitle>
                  <CardDescription>Manage how you sign in to your dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Passkey Support Warning */}
                  {!passkeySupported && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-900/20 dark:border-amber-800">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Passkeys are not supported in this browser. Please use a modern browser with WebAuthn support.
                      </p>
                    </div>
                  )}

                  {/* Passkey Error */}
                  {passkeyError && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/20 dark:border-red-800">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-700 dark:text-red-300">{passkeyError}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isConnected
                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-emerald-900/30 text-emerald-400 bg-emerald-900/30 text-emerald-400"
                        }`}>
                        <Fingerprint className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Passkeys</p>
                        <p className="text-sm text-zinc-400">
                          {isConnected
                            ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
                            : "Sign in with FaceID, TouchID, or device PIN"
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setShowAddPasskey(!showAddPasskey)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Another
                          </Button>
                          <Button variant="ghost" size="sm" onClick={disconnect}>
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleConnectPasskey}
                            disabled={!passkeySupported}
                          >
                            Sign In
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setShowAddPasskey(!showAddPasskey)}
                            disabled={!passkeySupported}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Passkey
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Add Passkey Form */}
                  {showAddPasskey && (
                    <div className="ml-14 p-4 bg-zinc-800/50 bg-zinc-800/50 rounded-xl border border-zinc-800 dark:border-zinc-700">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="passkeyUsername">Passkey Name</Label>
                          <Input
                            id="passkeyUsername"
                            placeholder="e.g., Work MacBook, Personal iPhone"
                            value={passkeyUsername}
                            onChange={(e) => setPasskeyUsername(e.target.value)}
                          />
                          <p className="text-xs text-zinc-400">
                            This helps you identify which device this passkey is for.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleAddPasskey}
                            disabled={isAddingPasskey}
                          >
                            {isAddingPasskey ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Fingerprint className="h-4 w-4 mr-2" />
                                Create Passkey
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowAddPasskey(false);
                              setPasskeyUsername("");
                              setPasskeyError(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Web3 Wallet</p>
                        <p className="text-sm text-zinc-400">Sign in with MetaMask, Coinbase Wallet, etc.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>API Access</CardTitle>
                  <CardDescription>Manage your API keys for programmatic access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-zinc-800 rounded-xl bg-zinc-800/50 dark:border-zinc-700 bg-zinc-900">
                    <div>
                      <p className="font-medium font-mono text-sm">sk_live_...e43f</p>
                      <p className="text-xs text-zinc-400 mt-1">Created on Jan 1, 2026</p>
                    </div>
                    <Button variant="destructive" size="sm">Revoke</Button>
                  </div>
                  <Button variant="outline" className="w-full">
                    Generate New API Key
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Settlement Preferences</CardTitle>
                  <CardDescription>Configure how and where you receive funds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="settlementAddress">Payment Receiving Address</Label>
                      <p className="text-sm text-zinc-400">
                        This is the wallet address where your payments will be received.
                      </p>
                      <Input
                        id="settlementAddress"
                        value={formData.walletAddress}
                        onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                        placeholder="0x..."
                        className="font-mono text-sm"
                      />
                      {formData.walletAddress && formData.walletAddress !== address && (
                        <p className="text-xs text-amber-400">
                          ⚠️ This address differs from your connected passkey wallet.
                        </p>
                      )}
                    </div>

                    {isConnected && address && (
                      <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">Connected Passkey Wallet</p>
                            <p className="text-xs text-zinc-400 font-mono mt-1">{address}</p>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <CheckCircle className="h-3 w-3 text-emerald-400" />
                            <span className="text-xs text-emerald-400">Connected</span>
                          </div>
                        </div>
                        {formData.walletAddress !== address && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleInputChange('walletAddress', address);
                              toast.success('Wallet address updated. Click "Save Payment Preferences" to apply.');
                            }}
                          >
                            <Wallet className="h-4 w-4 mr-2" />
                            Use Connected Wallet for Payments
                          </Button>
                        )}
                        {formData.walletAddress === address && (
                          <p className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Your connected wallet is set to receive payments
                          </p>
                        )}
                      </div>
                    )}

                    {!isConnected && (
                      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                        <div>
                          <p className="text-sm text-amber-300">No wallet connected</p>
                          <p className="text-xs text-amber-400/70">Connect your passkey to auto-fill your wallet address</p>
                        </div>
                        <Button size="sm" onClick={() => connect('passkey')} className="ml-auto">
                          Connect Passkey
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label>Accepted Currencies</Label>
                      <p className="text-sm text-zinc-400 mt-1">
                        Select which stablecoins you want to accept as payment. All Sera Protocol tokens are supported.
                      </p>
                    </div>

                    {/* Primary Currencies */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-zinc-300">Major Currencies</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { symbol: 'USDT', name: 'USD Tether', flag: '🇺🇸' },
                          { symbol: 'USDC', name: 'USD Coin', flag: '🇺🇸' },
                          { symbol: 'EURC', name: 'Euro Coin', flag: '🇪🇺' },
                          { symbol: 'GBPA', name: 'GBP Anchor', flag: '🇬🇧' },
                          { symbol: 'XSGD', name: 'StraitsX SGD', flag: '🇸🇬' },
                          { symbol: 'GYEN', name: 'GMO JPY', flag: '🇯🇵' },
                          { symbol: 'AUDD', name: 'Novatti AUD', flag: '🇦🇺' },
                          { symbol: 'CADC', name: 'CAD Coin', flag: '🇨🇦' },
                          { symbol: 'CCHF', name: 'Crypto CHF', flag: '🇨🇭' },
                        ].map(currency => (
                          <div key={currency.symbol} className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-emerald-500/50 transition-colors cursor-pointer group">
                            <input type="checkbox" id={`currency-${currency.symbol}`} defaultChecked className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{currency.flag}</span>
                                <label htmlFor={`currency-${currency.symbol}`} className="text-sm font-medium text-white cursor-pointer">{currency.symbol}</label>
                              </div>
                              <p className="text-xs text-zinc-500 truncate">{currency.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Emerging Markets */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-zinc-300">Emerging Markets</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { symbol: 'BRLA', name: 'BRL Anchor', flag: '🇧🇷' },
                          { symbol: 'MXNB', name: 'MXN Bitso', flag: '🇲🇽' },
                          { symbol: 'KRW1', name: 'KRW One', flag: '🇰🇷' },
                          { symbol: 'IDRX', name: 'Rupiah Token', flag: '🇮🇩' },
                          { symbol: 'THBK', name: 'THB Kasikorn', flag: '🇹🇭' },
                          { symbol: 'ZARP', name: 'ZAR Stablecoin', flag: '🇿🇦' },
                          { symbol: 'TRYB', name: 'BiLira', flag: '🇹🇷' },
                          { symbol: 'ARC', name: 'ARC INR', flag: '🇮🇳' },
                        ].map(currency => (
                          <div key={currency.symbol} className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-emerald-500/50 transition-colors cursor-pointer group">
                            <input type="checkbox" id={`currency-${currency.symbol}`} className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{currency.flag}</span>
                                <label htmlFor={`currency-${currency.symbol}`} className="text-sm font-medium text-white cursor-pointer">{currency.symbol}</label>
                              </div>
                              <p className="text-xs text-zinc-500 truncate">{currency.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Other Currencies */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-zinc-300">Other Currencies</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { symbol: 'NZDD', name: 'Novatti NZD', flag: '🇳🇿' },
                          { symbol: 'HKDR', name: 'HKD Reserve', flag: '🇭🇰' },
                          { symbol: 'PHPC', name: 'PHP Coin', flag: '🇵🇭' },
                          { symbol: 'MYRC', name: 'Malaysian Ringgit', flag: '🇲🇾' },
                          { symbol: 'cNGN', name: 'cNGN Stablecoin', flag: '🇳🇬' },
                          { symbol: 'ARZ', name: 'Argentine Peso', flag: '🇦🇷' },
                          { symbol: 'CNHT', name: 'Tether CNH', flag: '🇨🇳' },
                          { symbol: 'A7A5', name: 'A7A5 RUB', flag: '🇷🇺' },
                        ].map(currency => (
                          <div key={currency.symbol} className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-emerald-500/50 transition-colors cursor-pointer group">
                            <input type="checkbox" id={`currency-${currency.symbol}`} className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{currency.flag}</span>
                                <label htmlFor={`currency-${currency.symbol}`} className="text-sm font-medium text-white cursor-pointer">{currency.symbol}</label>
                              </div>
                              <p className="text-xs text-zinc-500 truncate">{currency.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <Button onClick={handleSave} loading={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Payment Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Choose what updates you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { id: "payments", label: "New Payments", desc: "When a customer completes a payment" },
                    { id: "payouts", label: "Settlements", desc: "When funds are settled to your wallet" },
                    { id: "invoices", label: "Invoice Updates", desc: "When an invoice is viewed or paid" },
                    { id: "security", label: "Security Alerts", desc: "Important security updates and login detections" }
                  ].map(item => (
                    <div key={item.id} className="flex items-start justify-between pb-4 border-b border-slate-100 last:border-0 border-zinc-800">
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-zinc-400">{item.desc}</p>
                      </div>
                      <input type="checkbox" className="h-5 w-5 rounded border-slate-300" defaultChecked />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
