"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    Palette,
    FileText,
    Receipt,
    Lock,
    Sparkles,
    Upload,
    RefreshCw,
    Eye,
    Crown,
    Gem,
    Award,
    Medal,
} from "lucide-react";
import type { MerchantTier } from "@prisma/client";

interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
}

interface InvoiceBrandingConfig {
    colorPalette: ColorPalette;
    headerStyle: "default" | "minimal" | "bold" | "gradient";
    logoPosition: "left" | "center" | "right";
    showSeraBranding: boolean;
    customFooterText?: string;
    fontFamily: string;
}

interface ReceiptBrandingConfig {
    colorPalette: ColorPalette;
    backgroundStyle: "solid" | "gradient" | "pattern" | "ai-generated";
    aiBackgroundUrl?: string;
    aiBackgroundTheme?: "professional" | "creative" | "minimal" | "luxury";
    headerStyle: "default" | "minimal" | "bold";
    certificateStyle: boolean;
    showSeraBranding: boolean;
    customFooterText?: string;
    fontFamily: string;
}

interface BrandingPermissions {
    canCustomizeInvoice: boolean;
    canCustomizeReceipt: boolean;
    canHideSeraBranding: boolean;
    canUseAIBackgrounds: boolean;
    canUseCertificateStyle: boolean;
}

interface ColorPreset {
    name: string;
    colors: ColorPalette;
}

interface BrandingData {
    tier: MerchantTier;
    permissions: BrandingPermissions;
    invoiceBranding: InvoiceBrandingConfig;
    receiptBranding: ReceiptBrandingConfig;
    colorPresets: ColorPreset[];
}

const TIER_ICONS: Record<MerchantTier, React.ElementType> = {
    BRONZE: Medal,
    SILVER: Award,
    GOLD: Crown,
    DIAMOND: Gem,
};

const TIER_COLORS: Record<MerchantTier, string> = {
    BRONZE: "text-orange-600",
    SILVER: "text-gray-400",
    GOLD: "text-yellow-500",
    DIAMOND: "text-cyan-400",
};

const FONT_OPTIONS = [
    { value: "helvetica", label: "Helvetica (Default)" },
    { value: "times", label: "Times New Roman" },
    { value: "courier", label: "Courier" },
];

export function BrandingSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingBackground, setGeneratingBackground] = useState(false);
    const [data, setData] = useState<BrandingData | null>(null);
    const [invoiceBranding, setInvoiceBranding] = useState<InvoiceBrandingConfig | null>(null);
    const [receiptBranding, setReceiptBranding] = useState<ReceiptBrandingConfig | null>(null);

    // Fetch branding data
    const fetchBranding = useCallback(async () => {
        try {
            const response = await fetch("/api/branding");
            if (!response.ok) throw new Error("Failed to fetch branding");
            const result = await response.json();
            setData(result);
            setInvoiceBranding(result.invoiceBranding);
            setReceiptBranding(result.receiptBranding);
        } catch (error) {
            console.error("Failed to fetch branding:", error);
            toast.error("Failed to load branding settings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranding();
    }, [fetchBranding]);

    // Save invoice branding
    const saveInvoiceBranding = async () => {
        if (!invoiceBranding) return;
        setSaving(true);
        try {
            const response = await fetch("/api/branding", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "invoice", branding: invoiceBranding }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast.success("Invoice branding saved successfully");
            setInvoiceBranding(result.branding);
        } catch (error) {
            console.error("Failed to save invoice branding:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save invoice branding");
        } finally {
            setSaving(false);
        }
    };

    // Save receipt branding
    const saveReceiptBranding = async () => {
        if (!receiptBranding) return;
        setSaving(true);
        try {
            const response = await fetch("/api/branding", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "receipt", branding: receiptBranding }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            toast.success("Receipt branding saved successfully");
            setReceiptBranding(result.branding);
        } catch (error) {
            console.error("Failed to save receipt branding:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save receipt branding");
        } finally {
            setSaving(false);
        }
    };

    // Generate AI background
    const generateAIBackground = async (theme: "professional" | "creative" | "minimal" | "luxury") => {
        setGeneratingBackground(true);
        try {
            const response = await fetch("/api/branding/ai-background", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            if (receiptBranding) {
                setReceiptBranding({
                    ...receiptBranding,
                    backgroundStyle: "ai-generated",
                    aiBackgroundUrl: result.backgroundUrl,
                    aiBackgroundTheme: theme,
                });
            }
            toast.success("AI background generated successfully!");
        } catch (error) {
            console.error("Failed to generate AI background:", error);
            toast.error(error instanceof Error ? error.message : "Failed to generate AI background");
        } finally {
            setGeneratingBackground(false);
        }
    };

    // Apply color preset
    const applyColorPreset = (presetName: string, type: "invoice" | "receipt") => {
        const preset = data?.colorPresets.find((p) => p.name === presetName);
        if (!preset) return;

        if (type === "invoice" && invoiceBranding) {
            setInvoiceBranding({ ...invoiceBranding, colorPalette: preset.colors });
        } else if (type === "receipt" && receiptBranding) {
            setReceiptBranding({ ...receiptBranding, colorPalette: preset.colors });
        }
        toast.success(`Applied ${preset.name} color preset`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Failed to load branding settings</p>
                    <Button onClick={fetchBranding} className="mt-4">
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const TierIcon = TIER_ICONS[data.tier];
    const tierColor = TIER_COLORS[data.tier];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Palette className="h-6 w-6" />
                        Custom Branding
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Customize how your invoices and receipts look to your customers
                    </p>
                </div>
                <Badge variant="outline" className={`gap-1 ${tierColor}`}>
                    <TierIcon className="h-4 w-4" />
                    {data.tier} Tier
                </Badge>
            </div>

            {/* Tier-based feature availability notice */}
            {!data.permissions.canCustomizeInvoice && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                    <CardContent className="flex items-center gap-4 p-4">
                        <Lock className="h-8 w-8 text-amber-500" />
                        <div>
                            <p className="font-medium">Unlock Custom Branding</p>
                            <p className="text-sm text-muted-foreground">
                                Upgrade to Silver tier or higher to customize your invoices and receipts
                            </p>
                        </div>
                        <Button variant="outline" className="ml-auto">
                            View Tiers
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Tabs for Invoice and Receipt */}
            <Tabs defaultValue="invoice" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="invoice" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Invoice Branding
                    </TabsTrigger>
                    <TabsTrigger
                        value="receipt"
                        className="gap-2"
                        disabled={!data.permissions.canCustomizeReceipt}
                    >
                        <Receipt className="h-4 w-4" />
                        Receipt Branding
                        {!data.permissions.canCustomizeReceipt && <Lock className="h-3 w-3 ml-1" />}
                    </TabsTrigger>
                </TabsList>

                {/* Invoice Branding Tab */}
                <TabsContent value="invoice">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Invoice Customization
                            </CardTitle>
                            <CardDescription>
                                Customize how your invoices appear to customers
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {data.permissions.canCustomizeInvoice && invoiceBranding ? (
                                <>
                                    {/* Color Palette */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Color Palette</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {data.colorPresets.map((preset) => (
                                                <Button
                                                    key={preset.name}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => applyColorPreset(preset.name, "invoice")}
                                                    className="gap-2"
                                                >
                                                    <div
                                                        className="h-4 w-4 rounded-full border"
                                                        style={{ backgroundColor: preset.colors.primary }}
                                                    />
                                                    {preset.name}
                                                </Button>
                                            ))}
                                        </div>

                                        {/* Custom colors */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Primary Color</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={invoiceBranding.colorPalette.primary}
                                                        onChange={(e) =>
                                                            setInvoiceBranding({
                                                                ...invoiceBranding,
                                                                colorPalette: {
                                                                    ...invoiceBranding.colorPalette,
                                                                    primary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="w-12 h-10 p-1 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={invoiceBranding.colorPalette.primary}
                                                        onChange={(e) =>
                                                            setInvoiceBranding({
                                                                ...invoiceBranding,
                                                                colorPalette: {
                                                                    ...invoiceBranding.colorPalette,
                                                                    primary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Secondary Color</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={invoiceBranding.colorPalette.secondary}
                                                        onChange={(e) =>
                                                            setInvoiceBranding({
                                                                ...invoiceBranding,
                                                                colorPalette: {
                                                                    ...invoiceBranding.colorPalette,
                                                                    secondary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="w-12 h-10 p-1 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={invoiceBranding.colorPalette.secondary}
                                                        onChange={(e) =>
                                                            setInvoiceBranding({
                                                                ...invoiceBranding,
                                                                colorPalette: {
                                                                    ...invoiceBranding.colorPalette,
                                                                    secondary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Accent Color</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={invoiceBranding.colorPalette.accent}
                                                        onChange={(e) =>
                                                            setInvoiceBranding({
                                                                ...invoiceBranding,
                                                                colorPalette: {
                                                                    ...invoiceBranding.colorPalette,
                                                                    accent: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="w-12 h-10 p-1 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={invoiceBranding.colorPalette.accent}
                                                        onChange={(e) =>
                                                            setInvoiceBranding({
                                                                ...invoiceBranding,
                                                                colorPalette: {
                                                                    ...invoiceBranding.colorPalette,
                                                                    accent: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Header Style */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Header Style</Label>
                                        <div className="grid grid-cols-4 gap-4">
                                            {(["default", "minimal", "bold", "gradient"] as const).map((style) => (
                                                <Button
                                                    key={style}
                                                    variant={invoiceBranding.headerStyle === style ? "default" : "outline"}
                                                    className="h-20 flex-col gap-1 capitalize"
                                                    onClick={() =>
                                                        setInvoiceBranding({ ...invoiceBranding, headerStyle: style })
                                                    }
                                                >
                                                    <div
                                                        className={`w-full h-8 rounded ${
                                                            style === "default"
                                                                ? "bg-gradient-to-r from-primary/20 to-primary/10"
                                                                : style === "minimal"
                                                                ? "border-b-2 border-primary"
                                                                : style === "bold"
                                                                ? "bg-primary"
                                                                : "bg-gradient-to-r from-primary to-secondary"
                                                        }`}
                                                    />
                                                    {style}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Logo Position */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Logo Position</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {(["left", "center", "right"] as const).map((position) => (
                                                <Button
                                                    key={position}
                                                    variant={invoiceBranding.logoPosition === position ? "default" : "outline"}
                                                    className="h-16 capitalize"
                                                    onClick={() =>
                                                        setInvoiceBranding({ ...invoiceBranding, logoPosition: position })
                                                    }
                                                >
                                                    <div
                                                        className={`flex w-full ${
                                                            position === "left"
                                                                ? "justify-start"
                                                                : position === "center"
                                                                ? "justify-center"
                                                                : "justify-end"
                                                        }`}
                                                    >
                                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs">
                                                            Logo
                                                        </div>
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Font Family */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Font Family</Label>
                                        <Select
                                            value={invoiceBranding.fontFamily}
                                            onValueChange={(value) =>
                                                setInvoiceBranding({ ...invoiceBranding, fontFamily: value })
                                            }
                                        >
                                            <SelectTrigger className="w-64">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FONT_OPTIONS.map((font) => (
                                                    <SelectItem key={font.value} value={font.value}>
                                                        {font.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Separator />

                                    {/* Custom Footer */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Custom Footer Text</Label>
                                        <Textarea
                                            placeholder="Thank you for your business! Visit us at www.example.com"
                                            value={invoiceBranding.customFooterText || ""}
                                            onChange={(e) =>
                                                setInvoiceBranding({
                                                    ...invoiceBranding,
                                                    customFooterText: e.target.value,
                                                })
                                            }
                                            rows={2}
                                        />
                                    </div>

                                    <Separator />

                                    {/* Show Sera Branding */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-medium">Show Sera Branding</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Display "Powered by Settla" in the footer
                                            </p>
                                        </div>
                                        {data.permissions.canHideSeraBranding ? (
                                            <Switch
                                                checked={invoiceBranding.showSeraBranding}
                                                onCheckedChange={(checked) =>
                                                    setInvoiceBranding({
                                                        ...invoiceBranding,
                                                        showSeraBranding: checked,
                                                    })
                                                }
                                            />
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                <Lock className="h-3 w-3" />
                                                Gold+ Tier
                                            </Badge>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="flex justify-end gap-4">
                                        <Button variant="outline" onClick={fetchBranding}>
                                            Reset
                                        </Button>
                                        <Button onClick={saveInvoiceBranding} disabled={saving}>
                                            {saving ? (
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            ) : null}
                                            Save Invoice Branding
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 space-y-4">
                                    <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <p className="text-muted-foreground">
                                        Invoice customization is available for Silver tier and above
                                    </p>
                                    <Button>Upgrade to Silver</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Receipt Branding Tab */}
                <TabsContent value="receipt">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Receipt Customization
                            </CardTitle>
                            <CardDescription>
                                Customize how your payment receipts appear to customers
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {data.permissions.canCustomizeReceipt && receiptBranding ? (
                                <>
                                    {/* AI Background Generation (Diamond only) */}
                                    {data.permissions.canUseAIBackgrounds && (
                                        <>
                                            <div className="space-y-4">
                                                <Label className="text-base font-medium flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-cyan-400" />
                                                    AI-Generated Background
                                                    <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
                                                        Diamond Exclusive
                                                    </Badge>
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Generate unique, professional backgrounds using AI
                                                </p>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {(["professional", "creative", "minimal", "luxury"] as const).map((theme) => (
                                                        <Button
                                                            key={theme}
                                                            variant={receiptBranding.aiBackgroundTheme === theme ? "default" : "outline"}
                                                            className="h-24 flex-col gap-2 capitalize"
                                                            onClick={() => generateAIBackground(theme)}
                                                            disabled={generatingBackground}
                                                        >
                                                            {generatingBackground ? (
                                                                <RefreshCw className="h-6 w-6 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="h-6 w-6" />
                                                            )}
                                                            {theme}
                                                        </Button>
                                                    ))}
                                                </div>
                                                {receiptBranding.aiBackgroundUrl && (
                                                    <div className="relative">
                                                        <img
                                                            src={receiptBranding.aiBackgroundUrl}
                                                            alt="AI Generated Background"
                                                            className="w-full h-32 object-cover rounded-lg border"
                                                        />
                                                        <Badge className="absolute top-2 right-2">
                                                            Current Background
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                            <Separator />
                                        </>
                                    )}

                                    {/* Background Style */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Background Style</Label>
                                        <div className="grid grid-cols-4 gap-4">
                                            {[
                                                { value: "solid", label: "Solid", disabled: false },
                                                { value: "gradient", label: "Gradient", disabled: false },
                                                { value: "pattern", label: "Pattern", disabled: false },
                                                {
                                                    value: "ai-generated",
                                                    label: "AI Generated",
                                                    disabled: !data.permissions.canUseAIBackgrounds,
                                                },
                                            ].map((style) => (
                                                <Button
                                                    key={style.value}
                                                    variant={receiptBranding.backgroundStyle === style.value ? "default" : "outline"}
                                                    className="h-16 flex-col gap-1"
                                                    onClick={() =>
                                                        !style.disabled &&
                                                        setReceiptBranding({
                                                            ...receiptBranding,
                                                            backgroundStyle: style.value as ReceiptBrandingConfig["backgroundStyle"],
                                                        })
                                                    }
                                                    disabled={style.disabled}
                                                >
                                                    {style.label}
                                                    {style.disabled && <Lock className="h-3 w-3" />}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Color Palette */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Color Palette</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {data.colorPresets.map((preset) => (
                                                <Button
                                                    key={preset.name}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => applyColorPreset(preset.name, "receipt")}
                                                    className="gap-2"
                                                >
                                                    <div
                                                        className="h-4 w-4 rounded-full border"
                                                        style={{ backgroundColor: preset.colors.primary }}
                                                    />
                                                    {preset.name}
                                                </Button>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Primary Color</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={receiptBranding.colorPalette.primary}
                                                        onChange={(e) =>
                                                            setReceiptBranding({
                                                                ...receiptBranding,
                                                                colorPalette: {
                                                                    ...receiptBranding.colorPalette,
                                                                    primary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="w-12 h-10 p-1 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={receiptBranding.colorPalette.primary}
                                                        onChange={(e) =>
                                                            setReceiptBranding({
                                                                ...receiptBranding,
                                                                colorPalette: {
                                                                    ...receiptBranding.colorPalette,
                                                                    primary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Secondary Color</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={receiptBranding.colorPalette.secondary}
                                                        onChange={(e) =>
                                                            setReceiptBranding({
                                                                ...receiptBranding,
                                                                colorPalette: {
                                                                    ...receiptBranding.colorPalette,
                                                                    secondary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="w-12 h-10 p-1 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={receiptBranding.colorPalette.secondary}
                                                        onChange={(e) =>
                                                            setReceiptBranding({
                                                                ...receiptBranding,
                                                                colorPalette: {
                                                                    ...receiptBranding.colorPalette,
                                                                    secondary: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Accent Color</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={receiptBranding.colorPalette.accent}
                                                        onChange={(e) =>
                                                            setReceiptBranding({
                                                                ...receiptBranding,
                                                                colorPalette: {
                                                                    ...receiptBranding.colorPalette,
                                                                    accent: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="w-12 h-10 p-1 cursor-pointer"
                                                    />
                                                    <Input
                                                        value={receiptBranding.colorPalette.accent}
                                                        onChange={(e) =>
                                                            setReceiptBranding({
                                                                ...receiptBranding,
                                                                colorPalette: {
                                                                    ...receiptBranding.colorPalette,
                                                                    accent: e.target.value,
                                                                },
                                                            })
                                                        }
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Certificate Style (Diamond only) */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-medium flex items-center gap-2">
                                                Certificate Style
                                                {!data.permissions.canUseCertificateStyle && (
                                                    <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
                                                        Diamond
                                                    </Badge>
                                                )}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Add an elegant certificate-style border with decorations
                                            </p>
                                        </div>
                                        {data.permissions.canUseCertificateStyle ? (
                                            <Switch
                                                checked={receiptBranding.certificateStyle}
                                                onCheckedChange={(checked) =>
                                                    setReceiptBranding({
                                                        ...receiptBranding,
                                                        certificateStyle: checked,
                                                    })
                                                }
                                            />
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                <Lock className="h-3 w-3" />
                                                Diamond Tier
                                            </Badge>
                                        )}
                                    </div>

                                    <Separator />

                                    {/* Header Style */}
                                    <div className="space-y-4">
                                        <Label className="text-base font-medium">Header Style</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {(["default", "minimal", "bold"] as const).map((style) => (
                                                <Button
                                                    key={style}
                                                    variant={receiptBranding.headerStyle === style ? "default" : "outline"}
                                                    className="h-16 capitalize"
                                                    onClick={() =>
                                                        setReceiptBranding({ ...receiptBranding, headerStyle: style })
                                                    }
                                                >
                                                    {style}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Font Family */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Font Family</Label>
                                        <Select
                                            value={receiptBranding.fontFamily}
                                            onValueChange={(value) =>
                                                setReceiptBranding({ ...receiptBranding, fontFamily: value })
                                            }
                                        >
                                            <SelectTrigger className="w-64">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FONT_OPTIONS.map((font) => (
                                                    <SelectItem key={font.value} value={font.value}>
                                                        {font.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Separator />

                                    {/* Custom Footer */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-medium">Custom Footer Text</Label>
                                        <Textarea
                                            placeholder="Thank you for choosing our service!"
                                            value={receiptBranding.customFooterText || ""}
                                            onChange={(e) =>
                                                setReceiptBranding({
                                                    ...receiptBranding,
                                                    customFooterText: e.target.value,
                                                })
                                            }
                                            rows={2}
                                        />
                                    </div>

                                    <Separator />

                                    {/* Show Sera Branding */}
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-medium">Show Sera Branding</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Display "Powered by Settla" on receipts
                                            </p>
                                        </div>
                                        {data.permissions.canHideSeraBranding ? (
                                            <Switch
                                                checked={receiptBranding.showSeraBranding}
                                                onCheckedChange={(checked) =>
                                                    setReceiptBranding({
                                                        ...receiptBranding,
                                                        showSeraBranding: checked,
                                                    })
                                                }
                                            />
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                <Lock className="h-3 w-3" />
                                                Gold+ Tier
                                            </Badge>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="flex justify-end gap-4">
                                        <Button variant="outline" onClick={fetchBranding}>
                                            Reset
                                        </Button>
                                        <Button onClick={saveReceiptBranding} disabled={saving}>
                                            {saving ? (
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            ) : null}
                                            Save Receipt Branding
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 space-y-4">
                                    <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                                    <p className="text-muted-foreground">
                                        Receipt customization is available for Gold tier and above
                                    </p>
                                    <Button>Upgrade to Gold</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Preview Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Live Preview
                    </CardTitle>
                    <CardDescription>
                        See how your branding will appear on documents
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Preview Invoice
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2"
                            disabled={!data.permissions.canCustomizeReceipt}
                        >
                            <Receipt className="h-4 w-4" />
                            Preview Receipt
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
