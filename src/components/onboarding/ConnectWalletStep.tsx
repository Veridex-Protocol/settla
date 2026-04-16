"use client";

import React from "react";
import { motion } from "framer-motion";
import { Fingerprint, Shield, Zap, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/wallet-context";
import { OnboardingData } from "./types";
import { cn } from "@/lib/utils";

interface ConnectWalletStepProps {
    data: OnboardingData;
    onConnect: () => void;
}

const FEATURES = [
    {
        icon: Shield,
        title: "No seed phrases",
        description: "Your keys are secured by your device's biometrics",
    },
    {
        icon: Zap,
        title: "Instant setup",
        description: "Create your wallet in seconds with passkey",
    },
    {
        icon: Lock,
        title: "Self-custody",
        description: "You control your assets, always",
    },
];

export function ConnectWalletStep({ data, onConnect }: ConnectWalletStepProps) {
    const { connectPasskey, isConnecting, isConnected, address, hasStoredPasskey } = useWallet();
    const [hasConnected, setHasConnected] = React.useState(false);

    React.useEffect(() => {
        if (isConnected && address && !hasConnected) {
            setHasConnected(true);
        }
    }, [isConnected, address, hasConnected]);

    const handleConnect = async () => {
        try {
            // If user has a stored passkey, authenticate; otherwise register new
            const mode = hasStoredPasskey ? 'authenticate' : 'register';
            await connectPasskey(mode, data.name || undefined);
            onConnect();
        } catch (error) {
            console.error("Failed to connect:", error);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Info */}
            <div className="flex-1 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Connect Your Veridex Wallet
                    </h2>
                    <p className="text-slate-400">
                        Get started by connecting your Veridex wallet using a passkey.
                        It&apos;s the safest and easiest way to manage your business payments.
                    </p>
                </div>

                <div className="space-y-4">
                    {FEATURES.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                                <feature.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-white">{feature.title}</h4>
                                <p className="text-sm text-slate-400">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* What is Passkey Tooltip */}
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <h4 className="text-sm font-medium text-indigo-400 mb-1">
                        💡 What is a Passkey?
                    </h4>
                    <p className="text-sm text-slate-400">
                        Passkeys use your device&apos;s biometric security (Face ID, Touch ID, or device PIN)
                        to authenticate you. They&apos;re phishing-resistant and work across all your devices.
                    </p>
                </div>
            </div>

            {/* Right: Connect Button */}
            <div className="flex-1 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    {hasConnected || isConnected ? (
                        <div className="text-center space-y-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30"
                            >
                                <CheckCircle2 className="h-12 w-12 text-white" />
                            </motion.div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">Connected!</h3>
                                <p className="text-sm text-slate-400 mt-1 font-mono">
                                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
                                </p>
                            </div>
                            <p className="text-sm text-slate-500">
                                Proceeding to business details...
                            </p>
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="flex h-32 w-32 mx-auto items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-2 border-violet-500/30">
                                <Fingerprint className="h-16 w-16 text-violet-400" />
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    Ready to Connect
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Click below to authenticate with your passkey
                                </p>
                            </div>

                            <Button
                                size="lg"
                                onClick={handleConnect}
                                disabled={isConnecting}
                                className={cn(
                                    "w-full h-14 text-lg font-semibold rounded-xl transition-all duration-300",
                                    "bg-gradient-to-r from-violet-600 to-indigo-600",
                                    "hover:from-violet-500 hover:to-indigo-500",
                                    "shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {isConnecting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Fingerprint className="mr-2 h-5 w-5" />
                                        Connect with Passkey
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-slate-500">
                                New to Veridex?{" "}
                                <span className="text-violet-400 cursor-pointer hover:underline">
                                    Create a wallet
                                </span>
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
