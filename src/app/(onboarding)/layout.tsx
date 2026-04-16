"use client";

import React from "react";
import Link from "next/link";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      {/* Header */}
      <header className="border-b border-slate-200/50 bg-white/50 backdrop-blur-lg dark:border-slate-800/50 dark:bg-slate-900/50">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <span className="text-xl font-bold text-white">S</span>
            </div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white">
              Sera
            </span>
          </Link>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Merchant Onboarding
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 bg-white/30 dark:border-slate-800/50 dark:bg-slate-900/30">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © 2026 Sera by Veridex Protocol. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/help" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Help
              </Link>
              <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
