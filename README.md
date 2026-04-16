# Sera Dashboard

Enterprise-grade stablecoin payment platform built on **Sera Protocol** - enabling businesses to accept multi-chain stablecoin payments with near-instant settlement.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Prisma](https://img.shields.io/badge/Prisma-7.x-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌟 Features Overview

### Core Payment Features
- **Payment Links** - Generate shareable payment URLs with QR codes
- **Invoice System** - Create, send, and track professional invoices
- **Multi-Chain Settlement** - Base, Ethereum, Optimism, Arbitrum, Solana, Aptos, Sui, Starknet
- **Multi-Currency Support** - 47+ stablecoins across 24 currencies (USDC, EURC, XSGD, etc.)
- **Real-Time Transaction Tracking** - Live status updates via GraphQL

### Authentication & Security
- **WebAuthn Passkeys** - Face ID, Touch ID, Windows Hello authentication
- **WalletConnect v2** - Connect any compatible wallet
- **Passkey-Backed Smart Wallets** - Hardware-level security without seed phrases
- **Session Management** - Secure session handling with NextAuth.js

### Gamification System
- **Merchant Tiers** - Bronze → Silver → Gold → Diamond progression
- **Sera Points** - Earn points for transactions, referrals, achievements
- **Streak System** - Daily activity tracking with streak bonuses
- **Achievements** - Unlock badges for milestones and accomplishments
- **Leaderboard** - Compete with other merchants (opt-in)
- **Goals** - Set and track personal business goals
- **Badge Cards** - AI-generated shareable achievement cards

### Tier Benefits

| Feature | Bronze | Silver | Gold | Diamond |
|---------|--------|--------|------|---------|
| Payment Links | ✅ | ✅ | ✅ | ✅ |
| Invoice Generation | ✅ | ✅ | ✅ | ✅ |
| Basic Receipts | ✅ | ✅ | ✅ | ✅ |
| Custom Invoice Branding | ❌ | ✅ | ✅ | ✅ |
| Custom Receipt Branding | ❌ | ❌ | ✅ | ✅ |
| Hide "Powered by Settla" | ❌ | ❌ | ✅ | ✅ |
| AI-Generated Backgrounds | ❌ | ❌ | ❌ | ✅ |
| Certificate-Style Receipts | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |
| Team Members (Limit) | 2 | 5 | 15 | Unlimited |

### Custom Branding (Silver+)
- **Color Palettes** - 7 presets + custom color picker
- **Header Styles** - Default, Minimal, Bold, Gradient
- **Logo Positioning** - Left, Center, Right placement
- **Custom Fonts** - Multiple font family options
- **Footer Customization** - Add custom footer text
- **AI Backgrounds** - Gemini 2.0 Flash generated backgrounds (Diamond)

### Notification System
- **Real-Time Notifications** - Server-Sent Events for instant updates
- **Notification Center** - Centralized notification management
- **Sound Effects** - Audio alerts for achievements (optional)
- **Animation Effects** - Confetti and visual celebrations
- **Email Digests** - Daily/weekly summary emails (configurable)

### Referral Program
- **Unique Referral Codes** - Share and earn rewards
- **Tiered Rewards** - Bonus points for active referrals
- **Referral Tracking** - Monitor referral status and conversions

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERA DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │   Next.js 16    │     │    Prisma 7     │     │   PostgreSQL    │        │
│  │   App Router    │ ──► │   ORM Layer     │ ──► │   (Neon DB)     │        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘        │
│           │                                                                   │
│           ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         SERA PROTOCOL                                    ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ││
│  │  │ Market      │  │ Order       │  │ Wormhole    │  │ GraphQL     │    ││
│  │  │ Router      │  │ Books       │  │ Bridge      │  │ Subgraph    │    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
sera/dashboard/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/
│   └── brand/                 # Brand assets
├── src/
│   ├── app/
│   │   ├── (onboarding)/      # Onboarding flow
│   │   ├── api/               # API routes
│   │   │   ├── achievements/  # Achievement endpoints
│   │   │   ├── analytics/     # Analytics endpoints
│   │   │   ├── badge-card/    # Badge card generation
│   │   │   ├── branding/      # Custom branding API
│   │   │   ├── goals/         # Goals management
│   │   │   ├── invoices/      # Invoice CRUD
│   │   │   ├── leaderboard/   # Leaderboard data
│   │   │   ├── notifications/ # Notification system
│   │   │   ├── payment-links/ # Payment link generation
│   │   │   ├── points/        # Points & rewards
│   │   │   ├── receipts/      # Receipt generation
│   │   │   ├── referral/      # Referral system
│   │   │   ├── team/          # Team management
│   │   │   ├── transactions/  # Transaction tracking
│   │   │   └── webhooks/      # Webhook handlers
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── login/             # Authentication
│   │   ├── pay/               # Payment pages
│   │   └── verify/            # Verification flow
│   ├── components/
│   │   ├── dashboard/         # Dashboard components
│   │   ├── gamification/      # Gamification UI
│   │   ├── invoices/          # Invoice components
│   │   ├── notifications/     # Notification UI
│   │   ├── onboarding/        # Onboarding components
│   │   ├── settings/          # Settings UI
│   │   ├── sharing/           # Social sharing
│   │   └── ui/                # Shadcn/UI components
│   ├── hooks/
│   │   └── use-notification-stream.ts
│   └── lib/
│       ├── services/          # Business logic services
│       │   ├── achievement-service.ts
│       │   ├── badge-card-service.ts
│       │   ├── branding-service.ts
│       │   ├── digest-service.ts
│       │   ├── referral-service.ts
│       │   └── tier-service.ts
│       ├── constants/         # Configuration constants
│       ├── pdf-invoice.ts     # Invoice PDF generation
│       ├── pdf-receipt.ts     # Receipt PDF generation
│       ├── settlement-service.ts
│       └── sera-client.ts     # Sera Protocol client
└── ...
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm/yarn
- PostgreSQL database (Neon recommended)

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Sera Protocol
SERA_GRAPHQL_URL="https://..."
SERA_MARKET_ROUTER="0x..."

# AI Services (for Diamond tier)
GEMINI_API_KEY="your-gemini-key"

# Email (optional)
RESEND_API_KEY="your-resend-key"
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Veridex-Protocol/sera-dashboard.git
cd sera-dashboard

# Install dependencies
bun install

# Generate Prisma client
bun prisma generate

# Push schema to database
bun prisma db push

# Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## 📡 API Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payment-links` | GET/POST | List/Create payment links |
| `/api/invoices` | GET/POST | List/Create invoices |
| `/api/transactions` | GET | List transactions |
| `/api/receipts/[id]` | GET | Get receipt PDF |
| `/api/branding` | GET/PUT | Manage custom branding |

### Gamification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/achievements` | GET/POST | List/Unlock achievements |
| `/api/points` | GET/POST | Get points / Award points |
| `/api/leaderboard` | GET | Get leaderboard |
| `/api/referral` | GET/POST | Referral management |
| `/api/goals` | GET/POST/PUT | Goal management |
| `/api/badge-card` | POST | Generate badge card image |

### Notification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications` | GET/PUT/DELETE | Notification management |
| `/api/notifications/stream` | GET | SSE notification stream |
| `/api/notifications/settings` | GET/PUT | Notification preferences |

---

## 🎨 Branding Configuration

### Invoice Branding (Silver+)

```typescript
interface InvoiceBrandingConfig {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
  headerStyle: "default" | "minimal" | "bold" | "gradient";
  logoPosition: "left" | "center" | "right";
  showSeraBranding: boolean;
  customFooterText?: string;
  fontFamily: string;
}
```

### Receipt Branding (Gold+)

```typescript
interface ReceiptBrandingConfig {
  colorPalette: ColorPalette;
  backgroundStyle: "solid" | "gradient" | "pattern" | "ai-generated";
  aiBackgroundUrl?: string;        // Diamond tier
  aiBackgroundTheme?: string;      // Diamond tier
  headerStyle: "default" | "minimal" | "bold";
  certificateStyle: boolean;       // Diamond tier
  showSeraBranding: boolean;
  customFooterText?: string;
  fontFamily: string;
}
```

---

## 🔗 Multi-Chain Support

| Chain | Network | Status | Settlement Time |
|-------|---------|--------|-----------------|
| Base | Sepolia | ✅ Hub | ~2 min |
| Ethereum | Sepolia | ✅ Spoke | ~3 min |
| Optimism | Sepolia | ✅ Spoke | ~2 min |
| Arbitrum | Sepolia | ✅ Spoke | ~2 min |
| Solana | Devnet | ✅ Spoke | ~1 min |
| Aptos | Testnet | ✅ Spoke | ~1 min |
| Sui | Testnet | ✅ Spoke | ~1 min |
| Starknet | Sepolia | ✅ Spoke | ~3 min |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL via Prisma 7
- **Authentication**: NextAuth.js + WebAuthn
- **Styling**: Tailwind CSS + Shadcn/UI
- **PDF Generation**: jsPDF
- **AI Services**: Google Gemini 2.0 Flash
- **Wallet Connection**: WalletConnect v2, viem
- **Real-time**: Server-Sent Events (SSE)

---

## 📊 Database Schema

Key models:
- `User` - Merchant accounts with gamification data
- `Business` - Business profiles and branding
- `Invoice` - Invoice management
- `PaymentLink` - Payment link generation
- `Transaction` - Transaction tracking
- `Receipt` - Receipt generation
- `Achievement` - Gamification achievements
- `PointTransaction` - Points history
- `Referral` - Referral tracking
- `Goal` - User goals
- `Notification` - Notification system

---

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🔗 Related Documentation

- [Sera Platform Documentation](../../business/integrations/sera/sera-platform-documentation.md)
- [Sera Product Roadmap](../../business/integrations/sera/sera-product-roadmap.md)
- [Sera Integration Guide](../../business/integrations/sera/sera-mvp-implementation-guide.md)
- [Sera Technical Reference](../../business/integrations/sera/sera-technical-reference.md)
