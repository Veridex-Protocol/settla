"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-context";
import {
    LayoutDashboard,
    FileText,
    Link2,
    ArrowLeftRight,
    Receipt,
    Settings,
    Users,
    HelpCircle,
    LogOut,
    ChevronLeft,
    Wallet,
    BarChart3,
    Trophy,
    Gift,
} from "lucide-react";
import { Button, Separator } from "@/components/ui";
import { NotificationBell } from "@/components/notifications";

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

const navigation = [
    {
        name: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Business overview",
    },
    {
        name: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        description: "Business insights",
    },
    {
        name: "Invoices",
        href: "/dashboard/invoices",
        icon: FileText,
        description: "Manage invoices",
    },
    {
        name: "Payment Links",
        href: "/dashboard/payments",
        icon: Link2,
        description: "Generate payment links",
    },
    {
        name: "Transactions",
        href: "/dashboard/transactions",
        icon: ArrowLeftRight,
        description: "Track inflow/outflow",
    },
    {
        name: "Receipts",
        href: "/dashboard/receipts",
        icon: Receipt,
        description: "Generated receipts",
    },
    {
        name: "Achievements",
        href: "/dashboard/achievements",
        icon: Trophy,
        description: "Badges & milestones",
    },
    {
        name: "Referrals",
        href: "/dashboard/referrals",
        icon: Gift,
        description: "Invite & earn",
    },
];

const secondaryNavigation = [
    {
        name: "Team",
        href: "/dashboard/team",
        icon: Users,
    },
    {
        name: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
    {
        name: "Help",
        href: "/dashboard/help",
        icon: HelpCircle,
    },
];

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { disconnect, address } = useWallet();

    const handleLogout = async () => {
        await disconnect();
        // Explicitly redirect to login after disconnect
        router.replace('/login');
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
                "bg-gradient-to-b from-zinc-900 to-zinc-950 border-r border-zinc-800",
                collapsed ? "w-20" : "w-72"
            )}
        >
            <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30">
                            <span className="text-lg font-bold text-white">S</span>
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-white">Settla</span>
                                <span className="text-xs text-zinc-400">Enterprise</span>
                            </div>
                        )}
                    </Link>
                    {onToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggle}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                            <ChevronLeft
                                className={cn(
                                    "h-5 w-5 transition-transform",
                                    collapsed && "rotate-180"
                                )}
                            />
                        </Button>
                    )}
                    {!collapsed && <NotificationBell />}
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                    {navigation.map((item) => {
                        // Overview (`/dashboard`) is the parent of every other
                        // dashboard route, so it must match exactly. Children
                        // get prefix matching so deep routes still highlight.
                        const isActive =
                            item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30"
                                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 shrink-0 transition-colors",
                                        isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-emerald-400"
                                    )}
                                />
                                {!collapsed && (
                                    <div className="flex flex-col">
                                        <span>{item.name}</span>
                                        {isActive && (
                                            <span className="text-xs text-zinc-500">{item.description}</span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}

                    <Separator className="my-4 bg-zinc-800" />

                    {secondaryNavigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-zinc-800/80 text-white"
                                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 shrink-0",
                                        isActive ? "text-slate-300" : "text-zinc-500 group-hover:text-zinc-400"
                                    )}
                                />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="border-t border-zinc-800 p-4">
                    {!collapsed && (
                        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 border border-emerald-500/20 p-4">
                            <h4 className="text-sm font-semibold text-white mb-1">Need Help?</h4>
                            <p className="text-xs text-zinc-400 mb-3">
                                Contact support for assistance with your account.
                            </p>
                            <Button size="sm" variant="outline" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                                Contact Support
                            </Button>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={collapsed ? handleLogout : undefined}
                            title={collapsed ? "Log out" : undefined}
                        >
                            <span className="text-sm font-semibold text-white">
                                {address ? address.slice(2, 4).toUpperCase() : 'JD'}
                            </span>
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected'}
                                </p>
                                <p className="text-xs text-zinc-400 truncate">Wallet</p>
                            </div>
                        )}
                        {!collapsed && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                                onClick={handleLogout}
                                title="Log out"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
