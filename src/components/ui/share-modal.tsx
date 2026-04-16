"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import {
  Twitter,
  Linkedin,
  Mail,
  Copy,
  Check,
  Share2,
  MessageCircle,
  QrCode,
  ExternalLink,
} from "lucide-react";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  shareUrl: string;
  shareText?: string;
  type?: "receipt" | "referral" | "payment-link" | "general";
  metadata?: {
    amount?: number;
    currency?: string;
    txHash?: string;
    referralCode?: string;
  };
}

export function ShareModal({
  open,
  onOpenChange,
  title = "Share",
  description,
  shareUrl,
  shareText,
  type = "general",
  metadata,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getShareContent = () => {
    switch (type) {
      case "receipt":
        return {
          twitter: `Just received ${metadata?.amount ? `$${metadata.amount}` : "a payment"} via @SeraPayHQ! 🎉 Non-custodial crypto payments made simple.`,
          linkedin: `Excited to share that I just processed a payment through Settla - the future of crypto payments for businesses. ${metadata?.amount ? `$${metadata.amount} settled instantly!` : ""} Check out how easy it is: ${shareUrl}`,
          email: {
            subject: `Payment Receipt from Settla`,
            body: `Hi,\n\nHere's the receipt for your recent payment.\n\nView receipt: ${shareUrl}\n\nThank you for using Settla!`,
          },
        };
      case "referral":
        return {
          twitter: `I've been using @SeraPayHQ for crypto payments - it's seamless! Use my referral link to get $25 credit: ${shareUrl}`,
          linkedin: `Highly recommend Settla for accepting crypto payments. Passkey auth (no seed phrases!), instant settlements, and low fees. Get $25 credit with my link: ${shareUrl}`,
          email: {
            subject: "Try Settla - Get $25 credit!",
            body: `Hi,\n\nI've been using Settla for accepting crypto payments and it's been great. They have passkey authentication (just use FaceID!), instant settlements, and super low fees.\n\nUse my referral link to sign up and get $25 credit:\n${shareUrl}\n\nLet me know if you have any questions!`,
          },
        };
      case "payment-link":
        return {
          twitter: `Send me crypto payments securely via @SeraPayHQ: ${shareUrl}`,
          linkedin: `Now accepting crypto payments via Settla - fast, secure, and non-custodial: ${shareUrl}`,
          email: {
            subject: "Payment Request",
            body: `Hi,\n\nYou can make a secure crypto payment using this link:\n${shareUrl}\n\nThank you!`,
          },
        };
      default:
        return {
          twitter: shareText || `Check this out: ${shareUrl}`,
          linkedin: shareText || `Sharing via Settla: ${shareUrl}`,
          email: {
            subject: "Check this out",
            body: shareText || `Here's something I wanted to share: ${shareUrl}`,
          },
        };
    }
  };

  const content = getShareContent();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTwitterText = encodeURIComponent(content.twitter);
  const encodedLinkedinText = encodeURIComponent(content.linkedin);

  const shareLinks = [
    {
      name: "Twitter / X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodedTwitterText}&url=${encodedUrl}`,
      color: "hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/30",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${content.twitter} ${shareUrl}`)}`,
      color: "hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30",
    },
    {
      name: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(content.email.subject)}&body=${encodeURIComponent(content.email.body)}`,
      color: "hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-emerald-400" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Copy Link */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-sm text-zinc-300 outline-none truncate"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className={cn(
                "transition-colors",
                copied && "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 transition-all",
                  link.color
                )}
              >
                <link.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{link.name}</span>
              </a>
            ))}
          </div>

          {/* Referral specific content */}
          {type === "referral" && metadata?.referralCode && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border border-emerald-500/30">
              <p className="text-sm text-zinc-400 mb-2">Your referral code</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-emerald-400 tracking-wider">
                  {metadata.referralCode}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(metadata.referralCode || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Earn $50 for each friend who joins and makes their first payment!
              </p>
            </div>
          )}

          {/* Transaction link for receipts */}
          {type === "receipt" && metadata?.txHash && (
            <a
              href={`https://basescan.org/tx/${metadata.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-cyan-500/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <QrCode className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-white">View on Blockchain</p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {metadata.txHash.slice(0, 10)}...{metadata.txHash.slice(-8)}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Share button component for easy integration
interface ShareButtonProps {
  shareUrl: string;
  type?: "receipt" | "referral" | "payment-link" | "general";
  metadata?: ShareModalProps["metadata"];
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareButton({
  shareUrl,
  type = "general",
  metadata,
  children,
  className,
  variant = "outline",
  size = "default",
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  const titles: Record<string, string> = {
    receipt: "Share Receipt",
    referral: "Invite Friends",
    "payment-link": "Share Payment Link",
    general: "Share",
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        {children || "Share"}
      </Button>
      <ShareModal
        open={open}
        onOpenChange={setOpen}
        title={titles[type]}
        shareUrl={shareUrl}
        type={type}
        metadata={metadata}
      />
    </>
  );
}
