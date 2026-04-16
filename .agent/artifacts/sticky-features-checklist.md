# Settla - Sticky Features Implementation Checklist

> **Objective**: Build all features from the competitive analysis to make Sera indispensable.
> 
> **Total Items**: 89 | **Progress**: 84% (75/89)

---

## Phase 1: Core Stickiness (Week 1-2)
**Target**: Foundation for retention and engagement

### 1.1 Merchant Tier System
- [x] **Database**: Add `merchantTier` enum (BRONZE, SILVER, GOLD, DIAMOND) to User/Merchant model ✅
- [x] **Database**: Add `totalVolume`, `tierUpdatedAt` fields to track progression ✅
- [x] **API**: Create tier calculation service (`/lib/services/tier-service.ts`) ✅
- [x] **API**: Auto-upgrade tier when volume thresholds are hit ✅
- [x] **UI**: Tier badge component with icons (🥉🥈🥇💎) ✅
- [x] **UI**: Tier progress bar showing distance to next tier ✅
- [x] **UI**: Tier benefits unlock modal ✅ (tier-benefits-modal.tsx)
- [x] **Dashboard**: Display current tier in header/sidebar ✅
- [ ] **Settings**: Tier status page with benefits breakdown

### 1.2 Achievement Badges
- [x] **Database**: Create `Achievement` model (id, type, earnedAt, merchantId) ✅
- [x] **Database**: Define achievement types enum ✅
- [x] **API**: Achievement earning service with event triggers ✅
- [x] **UI**: Badge component with hover tooltip ✅
- [x] **UI**: Achievement earned toast notification ✅ (achievement-notification.tsx)
- [x] **UI**: Achievement gallery page in settings ✅ (/dashboard/achievements)
- [x] **Badges**: "First Sale" - first payment received ✅
- [x] **Badges**: "Early Adopter" - signed up before launch ✅
- [x] **Badges**: "Reliable Revenue" - 30 consecutive days with payments ✅
- [x] **Badges**: "Speed Demon" - invoice paid within 1 hour ✅
- [x] **Badges**: "Team Player" - invited 3+ team members ✅
- [x] **Badges**: "Global Merchant" - payments from 5+ countries ✅
- [x] **Badges**: "Crypto Native" - 10+ different tokens received ✅
- [x] **Badges**: "100 Club" - 100 transactions milestone ✅

### 1.3 Celebration Animations
- [x] **UI**: Confetti animation component (react-confetti or canvas-confetti) ✅
- [x] **UI**: Payment received celebration modal ✅
- [x] **UI**: "Ka-ching" sound effect (optional, with toggle) ✅
- [x] **UI**: Milestone reached celebration (100 tx, $10k, etc.) ✅
- [x] **Dashboard**: Real-time payment notification with animation ✅
- [x] **Settings**: Toggle to enable/disable celebration effects ✅ (celebrationsEnabled, soundEnabled fields)

### 1.4 Referral Program (Basic)
- [x] **Database**: Add `referralCode` to User model ✅
- [x] **Database**: Create `Referral` model (referrerId, refereeId, status, rewardPaid) ✅
- [x] **API**: Generate unique referral codes ✅
- [x] **API**: Track referral signups and conversions ✅
- [x] **API**: Calculate and apply referral rewards ✅
- [x] **UI**: Referral dashboard page ✅ (/dashboard/referrals)
- [x] **UI**: Share referral link component (copy, WhatsApp, email, Twitter) ✅
- [x] **UI**: Referral stats (invites sent, signups, earnings) ✅
- [ ] **Email**: Referral invite email template
- [x] **Reward**: $50 credit for referrer on referee's first payment ✅
- [x] **Reward**: $25 credit for referee on signup ✅

---

## Phase 2: Gamification (Week 3-4)
**Target**: Points economy and engagement loops

### 2.1 Sera Points System
- [x] **Database**: Add `seraPoints` field to User model ✅
- [x] **Database**: Create `PointTransaction` model (userId, amount, reason, createdAt) ✅
- [x] **API**: Points earning service with action triggers ✅
- [x] **API**: Points redemption service ✅
- [x] **UI**: Points balance display in header ✅
- [x] **UI**: Points history page ✅ (/dashboard/points)
- [x] **UI**: Points earned toast notification ✅ (points-notification.tsx)
- [x] **Points**: +100 for completing onboarding ✅ (awardOnboardingPoints)
- [x] **Points**: +50 for creating first invoice ✅ (awardFirstInvoicePoints)
- [x] **Points**: +100 for first payment received ✅ (awardFirstPaymentPoints)
- [x] **Points**: +25 for enabling Passkey auth ✅ (awardPasskeyPoints)
- [x] **Points**: +500 for successful referral ✅ (awardReferralPoints)
- [x] **Points**: +1 per $100 monthly volume ✅ (awardVolumeBonus)
- [x] **Points**: +50 for completing profile ✅ (awardProfileCompletePoints)
- [x] **Points**: +100 for connecting integration ✅ (awardIntegrationPoints)

### 2.2 Redemption Store
- [x] **Config**: Created `Reward` catalog in constants/points.ts ✅
- [x] **API**: Reward redemption endpoint ✅ (/api/rewards/redeem)
- [x] **API**: Reward history endpoint ✅ (/api/rewards/history)
- [x] **UI**: Rewards store page ✅ (/dashboard/rewards)
- [x] **Reward**: Fee credits ($5, $10, $25) ✅
- [x] **Reward**: Premium features unlock ✅ (custom branding, pro analytics)
- [x] **Reward**: Priority support ticket ✅
- [x] **Reward**: Early access to beta features ✅
- [ ] **Reward**: Merch/swag (future)

### 2.3 Streaks & Milestones
- [x] **Database**: Add `currentStreak`, `longestStreak`, `lastActiveDate` to User ✅
- [x] **API**: Streak calculation on login/activity ✅ (updateStreak in achievement-service)
- [x] **UI**: Streak display component with fire emoji 🔥 ✅ (StreakDisplay in streak-display.tsx)
- [x] **UI**: Streak broken notification ✅ (StreakBrokenNotification in streak-display.tsx)
- [x] **Streak**: 7-day login streak → +50 points ✅
- [x] **Streak**: 30-day login streak → +200 points + badge ✅
- [x] **Milestone**: 100 transactions → fee discount ✅ (milestone-service.ts: tx_100_fee_discount, 5% for 90 days)
- [x] **Milestone**: $10k monthly volume → featured merchant ✅ (milestone-service.ts: volume_10k_featured, 30 days featured)

### 2.4 Goals & Targets
- [x] **Database**: Create `Goal` model (merchantId, type, targetValue, currentValue, deadline) ✅ (Prisma schema)
- [x] **API**: Goal CRUD endpoints ✅ (/api/goals)
- [x] **API**: Goal progress tracking (updated on relevant events) ✅ (goal-service.ts with updateRevenueGoals, updateInvoiceGoals, etc.)
- [x] **UI**: Goal setting modal ✅ (GoalSettingModal in goals.tsx)
- [x] **UI**: Goal progress widget on dashboard ✅ (GoalProgressWidget in goals.tsx)
- [x] **UI**: Goal achieved celebration ✅ (GoalAchievedCelebration in goals.tsx)
- [x] **Goal Types**: Monthly revenue target ✅
- [x] **Goal Types**: Invoices sent target ✅
- [x] **Goal Types**: Payment links created target ✅
- [x] **Goal Types**: Team growth target ✅

### 2.5 Leaderboard (Opt-in)
- [x] **Database**: Add `showOnLeaderboard` boolean to User ✅ (Prisma schema)
- [x] **API**: Leaderboard aggregation query (anonymized) ✅ (/api/leaderboard)
- [x] **UI**: Leaderboard page with categories ✅ (/dashboard/leaderboard)
- [x] **UI**: Opt-in/opt-out toggle in settings ✅ (/api/leaderboard/opt-in)
- [x] **Categories**: Top volume (monthly) ✅
- [x] **Categories**: Fastest growing ✅
- [x] **Categories**: Most consistent ✅
- [x] **Categories**: Best conversion rate ✅

### 2.6 Social Sharing (New)
- [x] **UI**: Smart Share Card component for high-def downloads ✅
- [x] **UI**: "Share Savings" card with credit-card style & QR code ✅
- [x] **UI**: Digital Referral Card with embedded QR code & blurred background ✅
- [x] **Feature**: QR codes linking to merchant referral link ✅

---

## Phase 3: Automation & Intelligence (Week 5-6)
**Target**: AI-powered insights and workflows

### 3.1 AI-Powered Insights
- [ ] **API**: Insights generation service
- [ ] **API**: Revenue pattern analysis
- [ ] **API**: Invoice timing optimization
- [ ] **API**: Churn risk prediction
- [ ] **Database**: Create `Insight` model (merchantId, type, message, action, dismissed)
- [ ] **UI**: Insights widget on dashboard
- [ ] **UI**: Insight cards with actions
- [ ] **UI**: Dismiss/apply insight buttons
- [ ] **Insight**: Payment timing recommendations
- [ ] **Insight**: Pricing optimization suggestions
- [ ] **Insight**: Fraud risk alerts
- [ ] **Insight**: Currency diversification tips

### 3.2 Automated Workflows
- [ ] **Database**: Create `Workflow` model (merchantId, trigger, action, enabled)
- [ ] **API**: Workflow CRUD endpoints
- [ ] **API**: Workflow execution engine
- [ ] **UI**: Workflow builder page
- [ ] **UI**: Workflow template gallery
- [ ] **Workflow**: Auto-remind on overdue invoice (3 days)
- [ ] **Workflow**: Auto-generate receipt on payment
- [ ] **Workflow**: Auto-notify team on large transactions
- [ ] **Workflow**: Auto-archive old paid invoices
- [ ] **Workflow**: Auto-thank customer after payment

### 3.3 Push Notifications
- [ ] **API**: Notification service with Web Push API
- [ ] **Database**: Create `NotificationPreference` model
- [ ] **UI**: Notification permission request
- [ ] **UI**: Notification preferences in settings
- [ ] **Notification**: Payment received
- [ ] **Notification**: Invoice paid
- [ ] **Notification**: Invoice overdue
- [ ] **Notification**: Goal achieved
- [ ] **Notification**: Tier upgrade
- [ ] **Notification**: Weekly summary

### 3.4 Webhooks Management
- [ ] **Database**: Create `Webhook` model (merchantId, url, events, secret, active)
- [ ] **API**: Webhook CRUD endpoints
- [ ] **API**: Webhook delivery service with retry logic
- [ ] **API**: Webhook signature verification
- [ ] **UI**: Webhook management page
- [ ] **UI**: Add webhook modal
- [ ] **UI**: Webhook delivery logs
- [ ] **UI**: Test webhook button
- [ ] **Events**: payment.received
- [ ] **Events**: invoice.created
- [ ] **Events**: invoice.paid
- [ ] **Events**: payment_link.clicked
- [ ] **Docs**: Webhook documentation

---

## Phase 4: Ecosystem & Integrations (Week 7-8)
**Target**: Make Sera the center of their stack

### 4.1 Zapier Integration
- [ ] **API**: Zapier app triggers
- [ ] **API**: Zapier app actions
- [ ] **Auth**: OAuth2 for Zapier
- [ ] **Docs**: Zapier integration documentation
- [ ] **Trigger**: New payment received
- [ ] **Trigger**: New invoice created
- [ ] **Action**: Create invoice
- [ ] **Action**: Create payment link

### 4.2 Accounting Integrations
- [ ] **API**: QuickBooks OAuth integration
- [ ] **API**: QuickBooks invoice sync
- [ ] **API**: Xero OAuth integration
- [ ] **API**: Xero invoice sync
- [ ] **UI**: Connect accounting modal
- [ ] **UI**: Sync status indicator
- [ ] **Settings**: Integration management page

### 4.3 Communication Integrations
- [ ] **API**: Slack app with OAuth
- [ ] **API**: Slack notifications (payment received, etc.)
- [ ] **API**: Discord webhook integration
- [ ] **API**: Telegram bot integration
- [ ] **UI**: Slack channel selector
- [ ] **UI**: Notification channel preferences

### 4.4 Community Hub
- [ ] **Page**: Community hub landing page
- [ ] **UI**: Merchant success stories showcase
- [ ] **UI**: Feature voting/roadmap board
- [ ] **UI**: Tips & best practices section
- [ ] **Link**: Discord community invite
- [ ] **Link**: Twitter/X community

---

## Quick Wins (This Week Priority)
**Target**: High-impact, low-effort features

### QW-1: Onboarding Checklist
- [x] **Database**: Add `onboardingCompleted` JSON to User ✅ (onboardingProgress field)
- [x] **API**: Track onboarding progress ✅ (/api/onboarding/checklist)
- [x] **UI**: Onboarding checklist widget on dashboard ✅ (OnboardingChecklist component)
- [x] **UI**: Checkmark animations ✅
- [x] **Steps**: Create account ✅
- [x] **Steps**: Set up business profile ✅
- [x] **Steps**: Create first invoice ✅
- [x] **Steps**: Create first payment link ✅
- [x] **Steps**: Receive first payment ✅
- [ ] **Steps**: Invite team member

### QW-2: Fee Comparison Calculator
- [x] **UI**: Savings calculator component ✅ (FeeSavingsCard)
- [x] **UI**: Monthly savings widget on dashboard ✅
- [x] **UI**: Comparison vs Stripe/PayPal/BitPay ✅
- [x] **UI**: Share savings button ✅

### QW-3: Share Receipt Feature
- [x] **UI**: Share payment receipt button ✅ (ShareButton)
- [x] **UI**: Social share modal (Twitter, LinkedIn) ✅ (ShareModal)
- [x] **UI**: Pre-filled tweet with referral link ✅
- [ ] **API**: Generate shareable receipt image/link

### QW-4: Trust & Transparency Dashboard
- [x] **UI**: Fund flow visualization ✅ (TrustDashboard)
- [x] **UI**: "Non-custodial" explainer tooltip ✅
- [x] **UI**: Real-time settlement status ✅
- [x] **UI**: Blockchain transaction links ✅
- [x] **UI**: TrustBadge in header ✅

### QW-5: Guest Checkout (No Wallet)
- [ ] **API**: Email-based payment flow
- [ ] **UI**: "Pay with Email" option on payment links
- [ ] **Email**: Payment link delivery
- [ ] **Flow**: Email → Click → Pay with card/crypto → Receipt

---

## Success Metrics Tracking

### Retention Metrics
- [ ] **Analytics**: Daily Active Merchants (DAM)
- [ ] **Analytics**: 7-day retention rate (target: >60%)
- [ ] **Analytics**: 30-day retention rate (target: >40%)
- [ ] **Analytics**: Average session duration (target: >3 min)

### Engagement Metrics
- [ ] **Analytics**: Invoice creation rate per merchant
- [ ] **Analytics**: Payment link conversion rate (target: >25%)
- [ ] **Analytics**: Referral rate (target: >15%)
- [ ] **Analytics**: Points earned per user

### Business Metrics
- [ ] **Analytics**: Total transaction volume
- [ ] **Analytics**: Average transaction size
- [ ] **Analytics**: Tier distribution
- [ ] **Analytics**: Feature adoption rates

---

## Database Schema Additions Summary

```prisma
// Add to User model
merchantTier       MerchantTier @default(BRONZE)
totalVolume        Decimal      @default(0)
tierUpdatedAt      DateTime?
seraPoints         Int          @default(0)
currentStreak      Int          @default(0)
longestStreak      Int          @default(0)
lastActiveDate     DateTime?
referralCode       String       @unique
showOnLeaderboard  Boolean      @default(false)
onboardingProgress Json?

// New models
model Achievement { ... }
model PointTransaction { ... }
model Referral { ... }
model Goal { ... }
model Insight { ... }
model Workflow { ... }
model Webhook { ... }
model NotificationPreference { ... }
model Reward { ... }

enum MerchantTier {
  BRONZE
  SILVER
  GOLD
  DIAMOND
}
```

---

*Created: 2026-01-13*
*Last Updated: 2026-01-13*
