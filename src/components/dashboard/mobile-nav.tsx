"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    FileText,
    Link2,
    ArrowRightLeft,
    Settings,
} from "lucide-react";

const navItems = [
    {
        name: "Home",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        name: "Invoices",
        href: "/dashboard/invoices",
        icon: FileText,
    },
    {
        name: "Links",
        href: "/dashboard/payments",
        icon: Link2,
    },
    {
        name: "Transactions",
        href: "/dashboard/transactions",
        icon: ArrowRightLeft,
    },
    {
        name: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-20 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 safe-area-inset-bottom">
            <div className="flex items-center justify-around h-full px-2">
                {navItems.map((item) => {
                    // For Overview (/dashboard), only exact match should be active
                    // For other routes, also match child routes
                    const isActive = item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                                isActive
                                    ? "text-emerald-400"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <div
                                className={cn(
                                    "relative p-2 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-emerald-500/10"
                                        : "bg-transparent"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-transform",
                                    isActive && "scale-110"
                                )} />
                                {isActive && (
                                    <div className="absolute inset-0 rounded-xl bg-emerald-500/20 animate-pulse" />
                                )}
                            </div>
                            <span className={cn(
                                "text-xs font-medium transition-all",
                                isActive ? "text-emerald-400" : "text-zinc-500"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
