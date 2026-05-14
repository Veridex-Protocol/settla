# Settla — Phase 2 Plan

> Status: Draft · Owner: Settla team · Last updated: now
>
> Phase 1 (foundations) shipped: encrypted credential store, dynamic decimals + balance correctness, invoice email payment links, Sera swap-helpers SDK, multi-stablecoin pay-link UI with FX quoting, unified emerald/cyan theme.

Phase 2 turns Settla from "merchant + payer with mocked swaps" into a production-grade, multi-rail, observability-rich stablecoin settlement product.

---

## 1. Objectives (what "done" looks like)

| # | Objective | Success metric |
|---|-----------|----------------|
| O1 | Real on-chain swap execution via Sera Router | Pay link with USDC→EURC settles fully on-chain in ≤30s, recorded with txHash |
| O2 | Smart routing: multi-hop, slippage-aware, gas-aware | ≥95% of quotes find the best of (direct / reverse / 2-hop) within 200ms |
| O3 | Merchant settlement currency preference enforced end-to-end | Merchant picks EURC → payer pays in any supported token → merchant receives EURC |
| O4 | Production observability | p50/p95 latency, swap success rate, FX slippage delta dashboards live |
| O5 | Hardened security posture | All credentials encrypted at rest, session keys rotated, no plaintext in logs |
| O6 | Developer-grade docs | Quickstart, API reference, swap routing guide, runbook |

---

## 2. Workstreams

### W1 — Real Sera swap execution (replaces `/api/swap/execute` mock)

- Wire `executeSwap()` in `fx-service.ts` to the Sera Router contract via the existing `sera-client.ts`.
- Build the order: `marketBid` (buy quote with base) vs `marketAsk` (sell base for quote) — chosen by `findSwapRoute` direction.
- 2-hop execution: chain two router calls atomically (multicall or sequential with rollback on failure).
- Gas estimation pre-flight; fail fast if balance < gas + input.
- Persist `SwapExecution` row: `quoteId`, `inputToken`, `outputToken`, `route`, `txHashes[]`, `actualOutput`, `slippageBps`, `status`.

**Deliverables**
- `src/lib/services/swap-executor.ts` (real impl)
- `prisma/schema.prisma` — `SwapExecution` model
- `/api/swap/execute` POST handler (replaces mock)
- Unit tests for route construction + integration test against Sera devnet

### W2 — Smart routing v2

Phase 1 used a simple direct→reverse→2-hop-USDC fallback. Phase 2 needs:

- **Multi-hop search**: BFS over the market graph up to depth 3, ranked by effective rate after fees + estimated slippage.
- **Liquidity-aware quoting**: pull orderbook depth from Sera; reject routes where input exceeds top-of-book.
- **Slippage modeling**: simulate fill against current book, not just mid-price.
- **Caching**: market graph cached 30s; quotes cached 5s keyed by `(in, out, amount-bucket)`.
- **Fallback policy**: if best route slippage > user tolerance, surface alternatives in UI.

**Deliverables**
- `src/lib/services/routing/graph.ts` — market graph builder
- `src/lib/services/routing/quote-engine.ts` — depth-aware quoter
- `src/lib/services/routing/__tests__/` — route correctness tests
- UI: SwapModal shows alternative routes when primary exceeds slippage

### W3 — Merchant settlement preference

- Merchant settings page already exists; add "Preferred settlement currency" dropdown (USDC default).
- Pay link generation reads merchant preference; `outputToken` is locked to that currency in SwapModal.
- Payer freely chooses `inputToken`; swap is auto-routed.
- If merchant prefers token X and payer pays in X, skip swap path entirely (fast path).

**Deliverables**
- `prisma`: `Merchant.preferredSettlementToken`
- `/dashboard/settings` UI section
- `/api/invoices` + `/api/pay-links` carry `outputToken` from merchant pref
- `pay/[id]/page.tsx` — outputToken locked; UI shows "You pay X → Merchant receives Y"

### W4 — Observability & analytics

- **Tracing**: OpenTelemetry on all `/api/*` routes; spans for `quote`, `route-search`, `execute`, `confirm`.
- **Metrics** (Prometheus or Vercel Analytics custom): `swap_quotes_total{route_type}`, `swap_executions_total{status}`, `swap_slippage_actual_vs_expected_bps`, `fx_route_search_duration_ms`.
- **Logs**: structured JSON, no PII, no key material. Correlate via `requestId` + `swapId`.
- **Merchant analytics**: replace mocked `/api/analytics` with real queries — volume per currency, conversion %, avg slippage, top routes.

**Deliverables**
- `src/lib/telemetry/tracer.ts`
- Dashboards: Grafana/Vercel preset JSON in `deploy/dashboards/`
- `/dashboard/analytics` reads real data

### W5 — Security hardening

Building on Phase 1's encrypted credential store:

- **Session key rotation**: rotate AES key on each login; old credentials re-encrypted lazily on next access.
- **Audit log**: append-only record of credential access, swap execution, settings changes.
- **Rate limiting**: `/api/swap/*`, `/api/invoices/*`, `/api/auth/*` — sliding window, per-session + per-IP.
- **CSP & headers**: strict CSP, HSTS, no inline scripts (audit existing nonces).
- **Webhook signatures**: HMAC on all outbound webhooks; verify inbound (Wormhole, Sera events).
- **Secret scanning**: pre-commit hook + CI gate.

**Deliverables**
- `src/lib/security/audit-log.ts`
- `middleware.ts` rate-limit additions
- `next.config.ts` security headers
- `.github/workflows/secret-scan.yml`

### W6 — Documentation

- `/docs/settla/quickstart.md` — 5-minute merchant onboarding
- `/docs/settla/swap-routing.md` — explain direct vs multi-hop, slippage, fees
- `/docs/settla/api.md` — `/api/invoices`, `/api/pay-links`, `/api/swap/*`
- `/docs/settla/runbook.md` — incident response, common failures, on-call procedures
- Inline JSDoc on all exported functions in `fx-service`, `swap-executor`, routing modules

---

## 3. Sequencing & milestones

| Milestone | Workstreams | Exit criteria |
|-----------|-------------|---------------|
| M1 — Real swaps | W1 | End-to-end USDC→EURC pay on devnet, persisted, with tx hash |
| M2 — Smart routing | W2 | Multi-hop quotes beat single-hop on ≥30% of test cases |
| M3 — Merchant prefs | W3 | Merchant sets EURC → all new pay links settle to EURC |
| M4 — Observability | W4 | Live dashboard; alert fires on swap failure spike |
| M5 — Hardening | W5 | Pen-test pass; rate limits live; audit log queryable |
| M6 — Docs & GA | W6 | External dev can integrate Settla in <1 hour using docs alone |

M1 → M2 → M3 are sequential (each builds on prior). M4, M5, M6 can run in parallel after M1.

---

## 4. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Sera orderbook thin → high slippage on 2-hop | Medium | High | Liquidity-aware quoting (W2); surface alternatives; configurable max slippage |
| Swap tx fails mid-multicall | Medium | High | Atomic multicall where possible; otherwise idempotent retry with status tracking |
| Encrypted credential migration breaks existing sessions | Low | High | Lazy re-encryption; version field on stored payloads |
| Observability cost spike | Low | Medium | Sample tracing at 10% in prod; full rate in staging |
| Multi-hop routing latency > 200ms target | Medium | Medium | Cache market graph; precompute popular routes |

---

## 5. Open questions

1. **Fee model**: Does Settla take a spread on FX, a flat fee, or zero (pure pass-through)? Affects W2 quote display.
2. **Failed swap UX**: Refund in input token automatically, or hold for retry? Affects W1 + W3.
3. **Stablecoin allowlist**: USDC, EURC, XSGD confirmed. Add USDT, PYUSD, DAI? Affects W2 graph + W3 UI.
4. **Custody model for merchant settlement**: direct-to-merchant-wallet vs Settla-held escrow with sweep? Affects W3.
5. **Chain expansion**: Stay Base + Eth Sepolia for Phase 2, or add Solana/Arbitrum? Affects all workstreams.

---

## 6. Out of scope for Phase 2

- Fiat on/off ramps (Phase 3)
- Subscription/recurring billing
- Multi-signer merchant accounts
- Mobile native app
- Non-stablecoin settlement (volatile assets)

---

## 7. Definition of Done for Phase 2

- [ ] Merchant can choose preferred settlement currency
- [ ] Payer can pay in any of {USDC, EURC, XSGD}; auto-converted to merchant pref
- [ ] All swaps execute on-chain via Sera Router with persisted txHashes
- [ ] Multi-hop routing live; quotes return in ≤200ms p95
- [ ] Observability dashboard shows volume, success rate, slippage delta
- [ ] Security audit checklist signed off (W5 deliverables)
- [ ] External developer onboarding doc validated by 1 outside engineer
