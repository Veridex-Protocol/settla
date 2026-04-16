"use client";

import React, { useState } from "react";
import { Bell, Search, Fingerprint, Loader2, CheckCircle, X, UserPlus, LogIn } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useWallet } from "@/lib/wallet-context";

interface HeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
    const {
        isConnected,
        isConnecting,
        address,
        passkeySupported,
        hasStoredPasskey,
        connectPasskey,
        disconnect
    } = useWallet();

    const [showDropdown, setShowDropdown] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [username, setUsername] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setError(null);
        try {
            await connectPasskey('authenticate');
            setShowConnectModal(false);
        } catch (err) {
            console.error('Failed to sign in:', err);
            setError('Failed to sign in. Make sure you have a registered passkey.');
        }
    };

    const handleRegister = async () => {
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }
        setError(null);
        try {
            await connectPasskey('register', username.trim());
            setShowConnectModal(false);
            setShowRegisterForm(false);
            setUsername('');
        } catch (err) {
            console.error('Failed to register:', err);
            setError('Failed to create passkey. Please try again.');
        }
    };

    const handleOpenConnect = () => {
        setError(null);
        setShowRegisterForm(false);
        setUsername('');
        setShowConnectModal(true);
    };

    return (
        <header className="sticky top-0 z-30 flex h-auto min-h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-lg px-4 sm:px-6 py-3 sm:py-0 gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-xs sm:text-sm text-zinc-400 line-clamp-1 sm:line-clamp-none">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden md:block relative">
                    <Input
                        placeholder="Search..."
                        className="w-64 pl-10"
                        icon={<Search className="h-4 w-4" />}
                    />
                </div>

                {/* Wallet Status */}
                {isConnected && address ? (
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            <CheckCircle className="h-4 w-4" />
                            <span className="hidden sm:inline font-mono">
                                {address.slice(0, 6)}...{address.slice(-4)}
                            </span>
                        </Button>

                        {showDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-lg dark:border-zinc-700 bg-zinc-800">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => {
                                        disconnect();
                                        setShowDropdown(false);
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Disconnect
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleOpenConnect}
                        disabled={isConnecting || !passkeySupported}
                    >
                        {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Fingerprint className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                            {isConnecting ? 'Connecting...' : 'Connect'}
                        </span>
                    </Button>
                )}

                {/* Connect Modal */}
                {showConnectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl dark:border-zinc-700 bg-zinc-900">
                            <button
                                onClick={() => setShowConnectModal(false)}
                                className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-zinc-800 hover:text-zinc-400 hover:bg-zinc-800"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="mb-6 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
                                    <Fingerprint className="h-8 w-8 text-white" />
                                </div>
                                <h2 className="text-xl font-semibold text-white text-white">
                                    {showRegisterForm ? 'Create New Passkey' : 'Connect with Passkey'}
                                </h2>
                                <p className="mt-1 text-sm text-zinc-400 text-zinc-400">
                                    {showRegisterForm
                                        ? 'Create a new passkey to access your wallet'
                                        : 'Use your passkey for secure, passwordless authentication'
                                    }
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            {showRegisterForm ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-zinc-300 text-zinc-300">
                                            Username
                                        </label>
                                        <Input
                                            placeholder="Enter your username or email"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                            autoFocus
                                        />
                                    </div>
                                    <Button
                                        className="w-full gap-2"
                                        onClick={handleRegister}
                                        disabled={isConnecting}
                                    >
                                        {isConnecting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <UserPlus className="h-4 w-4" />
                                        )}
                                        {isConnecting ? 'Creating...' : 'Create Passkey'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => {
                                            setShowRegisterForm(false);
                                            setError(null);
                                        }}
                                        disabled={isConnecting}
                                    >
                                        Back to sign in
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {hasStoredPasskey && (
                                        <Button
                                            className="w-full gap-2"
                                            onClick={handleSignIn}
                                            disabled={isConnecting}
                                        >
                                            {isConnecting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <LogIn className="h-4 w-4" />
                                            )}
                                            {isConnecting ? 'Signing in...' : 'Sign in with Passkey'}
                                        </Button>
                                    )}

                                    <Button
                                        variant={hasStoredPasskey ? "outline" : "default"}
                                        className="w-full gap-2"
                                        onClick={() => {
                                            setShowRegisterForm(true);
                                            setError(null);
                                        }}
                                        disabled={isConnecting}
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        {hasStoredPasskey ? 'Create new passkey' : 'Create Passkey'}
                                    </Button>

                                    {!hasStoredPasskey && (
                                        <p className="text-center text-xs text-zinc-400 text-zinc-400">
                                            Already have a passkey?{' '}
                                            <button
                                                className="text-emerald-400 hover:underline text-emerald-400"
                                                onClick={handleSignIn}
                                            >
                                                Sign in
                                            </button>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Connect Passkey Modal */}
                {showConnectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl dark:border-zinc-700 bg-zinc-900">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white text-white">
                                    {showRegisterForm ? 'Create New Passkey' : 'Connect Wallet'}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowConnectModal(false);
                                        setShowRegisterForm(false);
                                        setError(null);
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {error && (
                                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                    {error}
                                </div>
                            )}

                            {showRegisterForm ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-zinc-400 text-zinc-400">
                                        Create a new passkey to secure your wallet. Enter a username to identify this passkey.
                                    </p>
                                    <Input
                                        placeholder="Enter username (e.g., email or name)"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                        disabled={isConnecting}
                                    />
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setShowRegisterForm(false)}
                                            disabled={isConnecting}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-violet-700 hover:to-indigo-700"
                                            onClick={handleRegister}
                                            disabled={isConnecting || !username.trim()}
                                        >
                                            {isConnecting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserPlus className="h-4 w-4" />
                                            )}
                                            Create Passkey
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-zinc-400 text-zinc-400">
                                        Connect your wallet using a passkey for secure, passwordless authentication.
                                    </p>

                                    {/* Sign in with existing passkey */}
                                    <Button
                                        className="w-full gap-3 h-14 text-base bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-violet-700 hover:to-indigo-700"
                                        onClick={handleSignIn}
                                        disabled={isConnecting}
                                    >
                                        {isConnecting ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <LogIn className="h-5 w-5" />
                                        )}
                                        Sign in with Passkey
                                    </Button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-zinc-800 dark:border-zinc-700" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-zinc-900 px-2 text-zinc-400 bg-zinc-900 text-zinc-400">
                                                or
                                            </span>
                                        </div>
                                    </div>

                                    {/* Create new passkey */}
                                    <Button
                                        variant="outline"
                                        className="w-full gap-3 h-14 text-base"
                                        onClick={() => setShowRegisterForm(true)}
                                        disabled={isConnecting}
                                    >
                                        <UserPlus className="h-5 w-5" />
                                        Create New Passkey
                                    </Button>

                                    {hasStoredPasskey && (
                                        <p className="text-center text-xs text-zinc-400 text-zinc-400">
                                            You have a saved passkey on this device
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Notifications */}
                <div className="relative">
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5 text-zinc-400" />
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-[10px] font-bold text-white">
                            3
                        </span>
                    </Button>
                </div>

                {/* Actions */}
                {actions}
            </div>
        </header>
    );
}
