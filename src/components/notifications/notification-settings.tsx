"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Bell,
    Mail,
    DollarSign,
    FileText,
    Link2,
    Users,
    Shield,
    Sparkles,
    Clock,
    Loader2,
    Check,
    X,
    Info,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";

interface NotificationPreferences {
    id: string;
    userId: string;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    paymentReceived: boolean;
    paymentFailed: boolean;
    largePaymentThreshold: number | null;
    invoicePaid: boolean;
    invoiceOverdue: boolean;
    invoiceReminders: boolean;
    paymentLinkUsed: boolean;
    paymentLinkExpired: boolean;
    teamMemberJoined: boolean;
    teamMemberLeft: boolean;
    securityAlerts: boolean;
    systemUpdates: boolean;
    weeklyDigest: boolean;
    productUpdates: boolean;
    tips: boolean;
    digestFrequency: "daily" | "weekly" | "monthly" | "never";
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    quietHoursTimezone: string;
}

interface ToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled }: ToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                enabled ? "bg-emerald-500" : "bg-zinc-700",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <span
                className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    enabled ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}

interface SettingRowProps {
    icon: React.ElementType;
    iconColor?: string;
    title: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
    children?: React.ReactNode;
}

function SettingRow({
    icon: Icon,
    iconColor = "text-zinc-400",
    title,
    description,
    enabled,
    onChange,
    disabled,
    children,
}: SettingRowProps) {
    return (
        <div className="flex items-start justify-between gap-4 py-4 border-b border-zinc-800 last:border-0">
            <div className="flex gap-3">
                <div className="mt-0.5">
                    <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
                <div>
                    <p className="font-medium text-white">{title}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
                    {children}
                </div>
            </div>
            <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
        </div>
    );
}

export function NotificationSettings() {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    // Fetch preferences
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const res = await fetch("/api/notifications/preferences");
                if (!res.ok) throw new Error("Failed to fetch preferences");
                const data = await res.json();
                setPreferences(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load preferences");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPreferences();
    }, []);

    // Save preferences
    const savePreferences = async (updates: Partial<NotificationPreferences>) => {
        if (!preferences) return;

        setIsSaving(true);
        setSaveStatus("idle");

        try {
            const res = await fetch("/api/notifications/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (!res.ok) throw new Error("Failed to save preferences");

            const data = await res.json();
            setPreferences(data);
            setSaveStatus("success");

            // Reset success status after 2 seconds
            setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (err) {
            setSaveStatus("error");
        } finally {
            setIsSaving(false);
        }
    };

    // Update a single preference
    const updatePreference = <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => {
        if (!preferences) return;
        setPreferences({ ...preferences, [key]: value });
        savePreferences({ [key]: value });
    };

    if (isLoading) {
        return (
            <Card variant="glass" className="animate-pulse">
                <CardHeader>
                    <div className="h-6 w-48 bg-zinc-800 rounded" />
                    <div className="h-4 w-72 bg-zinc-800 rounded mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 bg-zinc-800/50 rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !preferences) {
        return (
            <Card variant="glass">
                <CardContent className="py-8 text-center">
                    <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-white font-medium">Failed to load notification settings</p>
                    <p className="text-zinc-500 text-sm mt-1">{error}</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" id="notifications">
            {/* Save status indicator */}
            {(isSaving || saveStatus !== "idle") && (
                <div
                    className={cn(
                        "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all",
                        isSaving && "bg-zinc-800 text-white",
                        saveStatus === "success" && "bg-emerald-500 text-white",
                        saveStatus === "error" && "bg-red-500 text-white"
                    )}
                >
                    {isSaving && (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    )}
                    {saveStatus === "success" && (
                        <>
                            <Check className="h-4 w-4" />
                            Saved
                        </>
                    )}
                    {saveStatus === "error" && (
                        <>
                            <X className="h-4 w-4" />
                            Failed to save
                        </>
                    )}
                </div>
            )}

            {/* Global Settings */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-emerald-400" />
                        Notification Channels
                    </CardTitle>
                    <CardDescription>
                        Control how you receive notifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingRow
                        icon={Bell}
                        iconColor="text-blue-400"
                        title="In-App Notifications"
                        description="Show notifications in the dashboard"
                        enabled={preferences.inAppEnabled}
                        onChange={(enabled) => updatePreference("inAppEnabled", enabled)}
                    />
                    <SettingRow
                        icon={Mail}
                        iconColor="text-emerald-400"
                        title="Email Notifications"
                        description="Receive notifications via email"
                        enabled={preferences.emailEnabled}
                        onChange={(enabled) => updatePreference("emailEnabled", enabled)}
                    />
                </CardContent>
            </Card>

            {/* Payment Notifications */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        Payments & Transactions
                    </CardTitle>
                    <CardDescription>
                        Stay updated on your payment activity
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingRow
                        icon={DollarSign}
                        iconColor="text-emerald-400"
                        title="Payment Received"
                        description="Get notified when you receive a payment"
                        enabled={preferences.paymentReceived}
                        onChange={(enabled) => updatePreference("paymentReceived", enabled)}
                    >
                        {preferences.paymentReceived && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Alert for payments above:</span>
                                <Input
                                    type="number"
                                    className="w-24 h-8 text-sm"
                                    value={preferences.largePaymentThreshold || ""}
                                    placeholder="1000"
                                    onChange={(e) => updatePreference("largePaymentThreshold", Number(e.target.value) || null)}
                                />
                                <span className="text-xs text-zinc-500">USDC</span>
                            </div>
                        )}
                    </SettingRow>
                    <SettingRow
                        icon={DollarSign}
                        iconColor="text-red-400"
                        title="Payment Failed"
                        description="Get notified when a payment fails"
                        enabled={preferences.paymentFailed}
                        onChange={(enabled) => updatePreference("paymentFailed", enabled)}
                    />
                </CardContent>
            </Card>

            {/* Invoice Notifications */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-400" />
                        Invoices
                    </CardTitle>
                    <CardDescription>
                        Invoice payment and reminder notifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingRow
                        icon={FileText}
                        iconColor="text-emerald-400"
                        title="Invoice Paid"
                        description="Get notified when an invoice is paid"
                        enabled={preferences.invoicePaid}
                        onChange={(enabled) => updatePreference("invoicePaid", enabled)}
                    />
                    <SettingRow
                        icon={FileText}
                        iconColor="text-amber-400"
                        title="Invoice Overdue"
                        description="Get notified when an invoice becomes overdue"
                        enabled={preferences.invoiceOverdue}
                        onChange={(enabled) => updatePreference("invoiceOverdue", enabled)}
                    />
                    <SettingRow
                        icon={Clock}
                        iconColor="text-zinc-400"
                        title="Invoice Reminders"
                        description="Send automatic payment reminders"
                        enabled={preferences.invoiceReminders}
                        onChange={(enabled) => updatePreference("invoiceReminders", enabled)}
                    />
                </CardContent>
            </Card>

            {/* Payment Links */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-emerald-400" />
                        Payment Links
                    </CardTitle>
                    <CardDescription>
                        Payment link activity notifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingRow
                        icon={Link2}
                        iconColor="text-emerald-400"
                        title="Payment Link Used"
                        description="Get notified when a payment link is used"
                        enabled={preferences.paymentLinkUsed}
                        onChange={(enabled) => updatePreference("paymentLinkUsed", enabled)}
                    />
                    <SettingRow
                        icon={Link2}
                        iconColor="text-amber-400"
                        title="Payment Link Expired"
                        description="Get notified when a payment link expires"
                        enabled={preferences.paymentLinkExpired}
                        onChange={(enabled) => updatePreference("paymentLinkExpired", enabled)}
                    />
                </CardContent>
            </Card>

            {/* Team */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-cyan-400" />
                        Team Activity
                    </CardTitle>
                    <CardDescription>
                        Team member updates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingRow
                        icon={Users}
                        iconColor="text-emerald-400"
                        title="Team Member Joined"
                        description="Get notified when a new team member joins"
                        enabled={preferences.teamMemberJoined}
                        onChange={(enabled) => updatePreference("teamMemberJoined", enabled)}
                    />
                    <SettingRow
                        icon={Users}
                        iconColor="text-red-400"
                        title="Team Member Left"
                        description="Get notified when a team member leaves"
                        enabled={preferences.teamMemberLeft}
                        onChange={(enabled) => updatePreference("teamMemberLeft", enabled)}
                    />
                </CardContent>
            </Card>

            {/* Security & System */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-red-400" />
                        Security & System
                    </CardTitle>
                    <CardDescription>
                        Important security and system notifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingRow
                        icon={Shield}
                        iconColor="text-red-400"
                        title="Security Alerts"
                        description="Important security notifications (recommended)"
                        enabled={preferences.securityAlerts}
                        onChange={(enabled) => updatePreference("securityAlerts", enabled)}
                    />
                    <SettingRow
                        icon={Info}
                        iconColor="text-blue-400"
                        title="System Updates"
                        description="Platform updates and maintenance notices"
                        enabled={preferences.systemUpdates}
                        onChange={(enabled) => updatePreference("systemUpdates", enabled)}
                    />
                </CardContent>
            </Card>

            {/* Digest & Marketing */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        Digest & Updates
                    </CardTitle>
                    <CardDescription>
                        Summaries, tips, and product updates
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingRow
                        icon={Mail}
                        iconColor="text-emerald-400"
                        title="Weekly Digest"
                        description="Summary of your business activity"
                        enabled={preferences.weeklyDigest}
                        onChange={(enabled) => updatePreference("weeklyDigest", enabled)}
                    >
                        {preferences.weeklyDigest && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Frequency:</span>
                                <Select
                                    value={preferences.digestFrequency}
                                    onValueChange={(value) =>
                                        updatePreference("digestFrequency", value as NotificationPreferences["digestFrequency"])
                                    }
                                >
                                    <SelectTrigger className="w-32 h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </SettingRow>
                    <SettingRow
                        icon={Sparkles}
                        iconColor="text-cyan-400"
                        title="Product Updates"
                        description="New features and improvements"
                        enabled={preferences.productUpdates}
                        onChange={(enabled) => updatePreference("productUpdates", enabled)}
                    />
                    <SettingRow
                        icon={Sparkles}
                        iconColor="text-amber-400"
                        title="Tips & Best Practices"
                        description="Helpful tips to grow your business"
                        enabled={preferences.tips}
                        onChange={(enabled) => updatePreference("tips", enabled)}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
