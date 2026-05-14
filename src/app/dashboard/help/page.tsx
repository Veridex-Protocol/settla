"use client";

import React, { useState } from "react";
import { Header } from "@/components/dashboard/header";
import {
    Card,
    CardContent,
    Button,
    Input,
} from "@/components/ui";
import {
    Search,
    Book,
    MessageCircle,
    FileQuestion,
    ChevronRight,
    ChevronDown,
    ExternalLink,
    Zap,
    Shield,
    Wallet,
    CreditCard,
    FileText,
    HelpCircle,
} from "lucide-react";

const faqs = [
    {
        icon: CreditCard,
        category: "Payments",
        question: "How do I create a payment link?",
        answer:
            "Go to the Payment Links section in the sidebar. Click the 'Create Link' button, enter the amount and currency, then click 'Create'. You can then share the generated link with your customers via email, SMS, or any messaging platform.",
    },
    {
        icon: Wallet,
        category: "Currencies",
        question: "What currencies does Sera support?",
        answer:
            "Sera supports major stablecoins including USDC (USD Coin), EURC (Euro Coin), XSGD (Singapore Dollar), and many more regional stablecoins. We settle all payments on-chain instantly with zero slippage.",
    },
    {
        icon: FileText,
        category: "Receipts",
        question: "How are receipts generated?",
        answer:
            "Receipts are automatically generated for every successful transaction. You can view them in the Receipts section, download them as PDF, or configure automatic email delivery to your customers.",
    },
    {
        icon: Zap,
        category: "Fees",
        question: "Is there a transaction fee?",
        answer:
            "Sera Protocol charges a minimal 0.5% protocol fee. For Enterprise pilot users, network fees (gas) are fully subsidized, making transactions effectively free for your customers.",
    },
    {
        icon: Shield,
        category: "Security",
        question: "How secure is the platform?",
        answer:
            "Sera uses enterprise-grade security including multi-signature wallets, audited smart contracts, and support for Passkeys (WebAuthn) for secure biometric authentication. All transactions are fully on-chain and verifiable.",
    },
    {
        icon: HelpCircle,
        category: "Support",
        question: "How do I get help with an issue?",
        answer:
            "You can reach our support team 24/7 via live chat, email at support@sett.la, or through our Discord community. Enterprise customers have access to dedicated account managers.",
    },
];

const resources = [
    {
        icon: Book,
        title: "Documentation",
        description: "Detailed guides on integration and API usage",
        href: "#",
        color: "emerald",
    },
    {
        icon: MessageCircle,
        title: "Live Chat",
        description: "Get instant help from our support team",
        href: "#",
        color: "cyan",
    },
    {
        icon: FileQuestion,
        title: "API Reference",
        description: "Complete API documentation for developers",
        href: "#",
        color: "purple",
    },
];

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const filteredFaqs = faqs.filter(
        (faq) =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                title="Help & Support"
                description="Find answers and get support for your business"
            />

            <div className="p-6 max-w-5xl mx-auto w-full space-y-8">
                {/* Search Hero */}
                <div className="relative py-12 px-8 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/30 border border-zinc-800 overflow-hidden">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.3),transparent_50%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.2),transparent_50%)]" />
                    </div>

                    <div className="relative text-center">
                        <h2 className="text-3xl font-bold text-white mb-3">
                            How can we help you today?
                        </h2>
                        <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                            Search our knowledge base or browse frequently asked questions
                            below
                        </p>
                        <div className="max-w-xl mx-auto relative">
                            <Input
                                placeholder="Search for answers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 pl-14 text-base bg-zinc-800/50 border-zinc-700 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                                icon={<Search className="h-5 w-5 text-zinc-400" />}
                            />
                        </div>
                    </div>
                </div>

                {/* Quick Resources */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {resources.map((resource) => (
                        <Card
                            key={resource.title}
                            variant="glass"
                            className="group cursor-pointer card-hover border-zinc-800 hover:border-emerald-500/30"
                        >
                            <CardContent className="p-6">
                                <div
                                    className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300
                    ${resource.color === "emerald"
                                            ? "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white"
                                            : resource.color === "cyan"
                                                ? "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white"
                                                : "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white"
                                        }`}
                                >
                                    <resource.icon className="h-6 w-6" />
                                </div>
                                <h3 className="font-semibold text-lg text-white mb-2">
                                    {resource.title}
                                </h3>
                                <p className="text-zinc-400 text-sm mb-4">
                                    {resource.description}
                                </p>
                                <div
                                    className={`flex items-center font-medium text-sm ${resource.color === "emerald"
                                            ? "text-emerald-400"
                                            : resource.color === "cyan"
                                                ? "text-cyan-400"
                                                : "text-emerald-400"
                                        }`}
                                >
                                    Learn more{" "}
                                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* FAQs Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-semibold text-white">
                            Frequently Asked Questions
                        </h3>
                        <span className="text-sm text-zinc-500">
                            {filteredFaqs.length} questions
                        </span>
                    </div>

                    {filteredFaqs.length === 0 ? (
                        <Card variant="glass" className="border-zinc-800">
                            <CardContent className="py-12 text-center">
                                <div className="h-16 w-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-zinc-500" />
                                </div>
                                <h4 className="text-lg font-semibold text-white mb-2">
                                    No results found
                                </h4>
                                <p className="text-zinc-400 max-w-sm mx-auto">
                                    Try adjusting your search terms or{" "}
                                    <button className="text-emerald-400 hover:underline">
                                        contact support
                                    </button>
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {filteredFaqs.map((faq, index) => (
                                <Card
                                    key={index}
                                    variant="glass"
                                    className={`border-zinc-800 transition-all duration-300 overflow-hidden ${expandedFaq === index
                                            ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                                            : "hover:border-zinc-700"
                                        }`}
                                >
                                    <button
                                        onClick={() =>
                                            setExpandedFaq(expandedFaq === index ? null : index)
                                        }
                                        className="w-full text-left p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${expandedFaq === index
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : "bg-zinc-800 text-zinc-400"
                                                    }`}
                                            >
                                                <faq.icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                        {faq.category}
                                                    </span>
                                                </div>
                                                <h4 className="font-medium text-lg text-white pr-8">
                                                    {faq.question}
                                                </h4>
                                            </div>
                                            <ChevronDown
                                                className={`h-5 w-5 text-zinc-400 flex-shrink-0 transition-transform duration-300 ${expandedFaq === index ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </div>
                                    </button>

                                    <div
                                        className={`overflow-hidden transition-all duration-300 ${expandedFaq === index
                                                ? "max-h-96 opacity-100"
                                                : "max-h-0 opacity-0"
                                            }`}
                                    >
                                        <div className="px-6 pb-6 pl-20">
                                            <p className="text-zinc-400 leading-relaxed">
                                                {faq.answer}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Contact CTA */}
                <Card
                    variant="glass"
                    className="relative overflow-hidden border-zinc-800"
                >
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10" />

                    <CardContent className="relative flex flex-col md:flex-row items-center justify-between p-8">
                        <div className="text-center md:text-left mb-6 md:mb-0">
                            <h3 className="text-xl font-bold text-white mb-2">
                                Still need help?
                            </h3>
                            <p className="text-zinc-400">
                                Our support team is available 24/7 to assist you with any
                                questions.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="border-zinc-700 text-white hover:bg-zinc-800"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Email Support
                            </Button>
                            <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Start Live Chat
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
