"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";
import { useWallet } from "@/lib/wallet-context";
import { Loader2, Menu, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { CommandPalette } from "@/components/ui/command-palette";
import { NotificationBell } from "@/components/notifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const { isConnected, isConnecting, hasStoredPasskey } = useWallet();
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Check onboarding status
  useEffect(() => {
    async function checkOnboarding() {
      if (status !== "authenticated") return;

      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          if (!data.onboardingCompleted) {
            router.replace('/onboarding');
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
      } finally {
        setOnboardingChecked(true);
        setIsCheckingOnboarding(false);
      }
    }

    if (status === "authenticated" && !onboardingChecked) {
      checkOnboarding();
    } else if (status !== "loading") {
      setIsCheckingOnboarding(false);
    }
  }, [status, router, onboardingChecked]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace('/login');
    }
  }, [status, router]);

  // Show loading state
  if (status === "loading" || isConnecting || isCheckingOnboarding) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            <div className="absolute inset-0 animate-ping">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Setting up your workspace</p>
            <p className="text-zinc-500 text-sm mt-1">This only takes a moment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-zinc-950">
        {/* Subtle gradient overlay */}
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-cyan-950/10 pointer-events-none" />

        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-semibold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Settla
            </span>
          </div>
          <NotificationBell />
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            "lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ease-in-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar
            collapsed={false}
            onToggle={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <main
          className={cn(
            "relative transition-all duration-300 ease-in-out min-h-screen",
            // Mobile: no margin, add top padding for header and bottom padding for nav
            "pt-16 pb-20 lg:pt-0 lg:pb-0",
            // Desktop: sidebar margin
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
          )}
        >
          {/* Welcome tooltip for first-time users (desktop only) */}
          {pathname === '/dashboard' && (
            <div className="hidden lg:block fixed bottom-6 right-6 z-50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-full text-sm text-zinc-300 hover:bg-zinc-700/80 transition-colors shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Need help?
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="font-medium mb-1">Welcome to Settla!</p>
                  <p className="text-zinc-400 text-xs">
                    Create payment links, send invoices, and receive stablecoin payments instantly.
                    Hover over any element for helpful tips.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />

        {/* Command Palette (Cmd+K) */}
        <CommandPalette />
      </div>
    </TooltipProvider>
  );
}
