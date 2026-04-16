"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  Button,
} from "@/components/ui";
import { ShareButton } from "@/components/ui/share-modal";
import {
  Gift,
  Users,
  DollarSign,
  Copy,
  Check,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Share2,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SmartShareCard } from "@/components/sharing/smart-share-card";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalInvites: number;
    signups: number;
    conversions: number;
    totalEarnings: number;
  };
  referrals: {
    id: string;
    status: "PENDING" | "CONVERTED" | "EXPIRED";
    createdAt: string;
    convertedAt?: string;
    reward?: number;
  }[];
  shareContent: {
    twitter: string;
    whatsapp: string;
    email: {
      subject: string;
      body: string;
    };
    linkedin: string;
  };
}

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  CONVERTED: {
    label: "Converted",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    icon: XCircle,
  },
};

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/referral");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCopy = async () => {
    if (data?.referralLink) {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (platform: string) => {
    if (!data) return;

    let url = "";
    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.shareContent.twitter)}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referralLink)}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(data.shareContent.whatsapp)}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent(data.shareContent.email.subject)}&body=${encodeURIComponent(data.shareContent.email.body)}`;
        break;
    }
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col">
        <Header
          title="Referral Program"
          description="Invite friends and earn rewards"
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title={
          <span className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-pink-400" />
            Referral Program
          </span>
        }
        description="Invite merchants and earn $50 for each successful referral"
        actions={
          <ShareButton
            type="referral"
            shareUrl={data?.referralLink || ""}
            metadata={{
              referralCode: data?.referralCode,
            }}
          />
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Invites</p>
                  <p className="text-3xl font-bold text-white">
                    {data?.stats?.totalInvites || 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Share2 className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Signups</p>
                  <p className="text-3xl font-bold text-white">
                    {data?.stats?.signups || 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Conversions</p>
                  <p className="text-3xl font-bold text-white">
                    {data?.stats?.conversions || 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Total Earnings</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    ${data?.stats?.totalEarnings || 0}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Share Section */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-400" />
              Your Referral Link
            </CardTitle>
            <CardDescription>
              Share your unique link to earn rewards when friends sign up and start using Settla
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Link */}
              <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <code className="flex-1 text-sm text-emerald-400 truncate font-mono">
                  {data?.referralLink || "Loading..."}
                </code>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
                </Tooltip>
              </div>

              {/* Share buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare("twitter")}
                  className="bg-[#1DA1F2]/10 border-[#1DA1F2]/30 hover:bg-[#1DA1F2]/20"
                >
                  <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare("linkedin")}
                  className="bg-[#0A66C2]/10 border-[#0A66C2]/30 hover:bg-[#0A66C2]/20"
                >
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare("whatsapp")}
                  className="bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366]/20"
                >
                  <MessageCircle className="h-4 w-4 text-[#25D366]" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleShare("email")}
                  className="bg-zinc-500/10 border-zinc-500/30 hover:bg-zinc-500/20"
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Referral code */}
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
              <span>Your referral code:</span>
              <code className="px-2 py-0.5 rounded bg-zinc-800 font-mono text-white">
                {data?.referralCode || "---"}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Digital Referral Card */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">New</Badge>
              Digital Referral Card
            </CardTitle>
            <CardDescription>
              Download your personalized referral card to share on social media
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-zinc-900/50 rounded-xl p-8 border border-zinc-700/50">
              <div className="text-center md:text-left max-w-sm">
                <h4 className="text-lg font-semibold text-white mb-2">Shareable & Professional</h4>
                <p className="text-zinc-400 text-sm mb-4">
                  This high-definition card includes your unique referral QR code.
                  Perfect for sharing on Twitter, LinkedIn, or Instagram Stories.
                </p>
                <div className="flex gap-2 justify-center md:justify-start">
                  <Badge variant="secondary" className="bg-zinc-800">High Definition</Badge>
                  <Badge variant="secondary" className="bg-zinc-800">QR Code Embedded</Badge>
                </div>
              </div>

              <div className="flex-shrink-0">
                {data ? (
                  <SmartShareCard
                    type="referral"
                    data={{ code: data.referralCode }}
                    referralLink={data.referralLink}
                    className="transform hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-[200px] w-[340px] bg-zinc-800 animate-pulse rounded-xl" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                  <Share2 className="h-6 w-6 text-blue-400" />
                </div>
                <h4 className="font-medium text-white mb-1">1. Share Your Link</h4>
                <p className="text-sm text-zinc-400">
                  Send your unique referral link to fellow merchants
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <h4 className="font-medium text-white mb-1">2. They Sign Up</h4>
                <p className="text-sm text-zinc-400">
                  Your friend creates an account and gets $25 in credits
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
                <h4 className="font-medium text-white mb-1">3. You Both Earn</h4>
                <p className="text-sm text-zinc-400">
                  You get $50 when they receive their first payment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Referral History
            </CardTitle>
            <CardDescription>
              Track your referrals and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.referrals || data.referrals.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-zinc-500" />
                </div>
                <h4 className="font-medium text-white mb-2">No referrals yet</h4>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-4">
                  Share your referral link to start earning rewards when friends sign up
                </p>
                <Button onClick={handleCopy} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Referral Link
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.referrals.map((referral) => {
                  const status = STATUS_CONFIG[referral.status];
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${referral.status === "CONVERTED" ? "bg-emerald-500/10" :
                          referral.status === "PENDING" ? "bg-amber-500/10" :
                            "bg-zinc-700"
                          }`}>
                          <StatusIcon className={`h-5 w-5 ${referral.status === "CONVERTED" ? "text-emerald-400" :
                            referral.status === "PENDING" ? "text-amber-400" :
                              "text-zinc-500"
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">Referral #{referral.id.slice(-6)}</p>
                          <p className="text-sm text-zinc-400">
                            Invited {new Date(referral.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {referral.reward && (
                          <span className="font-medium text-emerald-400">
                            +${referral.reward}
                          </span>
                        )}
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
