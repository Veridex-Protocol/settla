"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Gift,
  Users,
  DollarSign,
  Copy,
  Check,
  Share2,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { ShareModal } from "./share-modal";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalEarned: number;
  referrals: Array<{
    id: string;
    status: string;
    userName: string | null;
    userEmail: string | null;
    signupDate: string;
    convertedAt: string | null;
    reward: number | null;
  }>;
  shareContent: {
    twitter: { text: string; url: string };
    whatsapp: { text: string };
    email: { subject: string; body: string };
    linkedin: { text: string; url: string };
  };
}

interface ReferralDashboardProps {
  className?: string;
}

export function ReferralDashboard({ className }: ReferralDashboardProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const res = await fetch("/api/referral");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferralData();
  }, []);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className={cn("p-6 animate-pulse space-y-4", className)}>
        <div className="h-32 bg-zinc-800 rounded-2xl" />
        <div className="h-24 bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border border-emerald-500/30 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5" />
        <div className="absolute top-4 right-4">
          <Sparkles className="h-8 w-8 text-amber-400/30" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <Gift className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Share & Earn</h2>
              <p className="text-zinc-400">Invite merchants, get rewarded</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-zinc-400 mb-1">You Earn</p>
              <p className="text-3xl font-bold text-emerald-400">$50</p>
              <p className="text-xs text-zinc-500">per referral</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-zinc-400 mb-1">They Get</p>
              <p className="text-3xl font-bold text-cyan-400">$25</p>
              <p className="text-xs text-zinc-500">signup credit</p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 mb-4">
            <p className="text-xs text-zinc-400 mb-2">Your Referral Code</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-white tracking-widest font-mono">
                {data.referralCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(data.referralCode)}
                className={cn(copied && "text-emerald-400")}
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Share Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Share Link
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleCopy(data.referralLink)}
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{data.totalReferrals}</p>
            <p className="text-xs text-zinc-400">Total Invited</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{data.convertedReferrals}</p>
            <p className="text-xs text-zinc-400">Converted</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">${data.totalEarned}</p>
            <p className="text-xs text-zinc-400">Total Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral List */}
      {data.referrals.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Your Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-zinc-300">
                        {referral.userName?.[0] || referral.userEmail?.[0] || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {referral.userName || referral.userEmail?.split("@")[0] || "Anonymous"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Joined {new Date(referral.signupDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {referral.status === "pending" ? (
                      <Badge variant="warning" dot>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="success" dot>Converted</Badge>
                        {referral.reward && (
                          <p className="text-sm font-medium text-emerald-400 mt-1">
                            +${referral.reward}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {[
              { step: 1, title: "Share your link", desc: "Send to fellow merchants" },
              { step: 2, title: "They sign up", desc: "Using your referral code" },
              { step: 3, title: "First payment", desc: "They make their first sale" },
              { step: 4, title: "You get paid!", desc: "$50 credited to you" },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-400">{item.desc}</p>
                  </div>
                </div>
                {index < 3 && (
                  <ChevronRight className="h-5 w-5 text-zinc-600 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Share Modal */}
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="Invite Friends"
        shareUrl={data.referralLink}
        type="referral"
        metadata={{ referralCode: data.referralCode }}
      />
    </div>
  );
}

// Compact widget for dashboard
export function ReferralWidget({ className }: { className?: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await fetch("/api/referral");
        if (res.ok) {
          const json = await res.json();
          setCode(json.referralCode);
          setLink(json.referralLink);
        }
      } catch (error) {
        console.error("Failed to fetch referral code:", error);
      }
    };
    fetchCode();
  }, []);

  const handleCopy = async () => {
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!code) return null;

  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border border-emerald-500/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Gift className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Earn $50 per referral</p>
          <p className="text-xs text-zinc-400">Share with fellow merchants</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className={cn("gap-1.5", copied && "text-emerald-400 border-emerald-500/30")}
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
