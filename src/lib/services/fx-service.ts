'use client';

/**
 * FX Service — Real Sera API integration.
 *
 * Responsibilities
 *  - Discover Sera tokens + markets via /api/sera/markets (server proxy)
 *  - Request swap quotes via /api/sera/swap/quote (server proxy → Sera POST /swap/quote)
 *  - Execute signed swaps via /api/sera/swap/execute (server proxy → Sera POST /swap)
 *
 * What this file does NOT do
 *  - Routing / multi-hop math — Sera resolves routes server-side, we just ask
 *  - Mock price calculation — quotes come from Sera, including fee_breakdown
 *  - Signing — done in the UI layer via wallet-context.signTypedData()
 *
 * Token resolution
 *  - The Sera REST API accepts token *addresses*. We expose a symbol → address
 *    lookup built from /tokens. UI components should pass symbols; we resolve
 *    on the way out.
 */

import type { TypedDataDomain, TypedDataField } from 'ethers';

/* ─── External (Sera) shapes ────────────────────────────────────────────── */

export interface SeraToken {
  address: string;
  symbol: string;
  name?: string;
  decimals: number;
  chain_id?: number;
}

export interface SeraMarket {
  // The Sera markets payload exposes both quote/base sides; we keep the raw
  // shape opaque and only rely on symbols for filtering.
  id?: string;
  pair?: string;
  quoteToken?: { symbol?: string; address?: string; decimals?: number };
  baseToken?: { symbol?: string; address?: string; decimals?: number };
  latestPrice?: string;
}

/**
 * Sera /swap/quote response (subset we rely on). The `permit` field is null
 * when no permit signing is required (e.g. allowance pre-granted, or the token
 * is non-permittable and approval flow is needed instead).
 */
export interface SeraQuoteEnvelope {
  uuid: string;
  expires_at: number;
  route_params: {
    taker: string;
    inputToken: string;
    outputToken: string;
    maxInputAmount: string;
    minOutputAmount: string;
    recipient: string;
    initialDepositAmount: string;
    uuid: string;
    deadline: number;
  };
  fee_breakdown?: {
    network_fee?: string;
    protocol_fee?: string;
    total_fee?: string;
    [k: string]: unknown;
  };
  permit: SeraPermit | null;
  permit_supported?: boolean;
}

export interface SeraPermit {
  eip712: {
    domain: TypedDataDomain;
    types: Record<string, TypedDataField[]>;
    primaryType?: string;
    message: { deadline: number;[k: string]: unknown };
  };
}

/* ─── UI-facing shapes (kept stable for existing consumers) ─────────────── */

export interface FXQuote {
  // Display fields
  inputToken: string;          // symbol
  outputToken: string;         // symbol
  inputAmount: string;         // human units
  estimatedOutput: string;     // human units
  minOutput: string;           // human units
  slippageBps: number;
  timestamp: number;
  expiresAt: number;           // ms epoch
  route: { direct: boolean; hops: string[] };

  // Sera-specific (required for execution)
  quoteUuid: string;
  routeParams: SeraQuoteEnvelope['route_params'];
  feeBreakdown?: SeraQuoteEnvelope['fee_breakdown'];
  permit: SeraPermit | null;

  // EIP-712 envelope for the Intent signature (computed client-side)
  intentDomain: TypedDataDomain;
  intentTypes: Record<string, TypedDataField[]>;
  intentMessage: Record<string, unknown>;
}

export interface FXExecuteRequest {
  quote: FXQuote;
  signature: string;            // Intent EIP-712 signature
  permitSignature?: string;     // EIP-2612 permit signature (when quote.permit != null)
  permitDeadline?: number;
}

export interface FXExecuteResult {
  success: boolean;
  tradeId?: string;
  txHash?: string;
  inputAmount: string;
  outputAmount: string;
  error?: string;
  errorCode?: string;
}

/**
 * Typed error thrown by getQuote so callers can branch on Sera's error_code
 * (per docs.sera.cx/api-reference/endpoints/swaps/#error-envelope) instead of
 * regex-matching free-form strings.
 */
export class FXError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly minAmount?: string;
  readonly minAmountRaw?: string;

  constructor(message: string, opts: {
    code?: string;
    status?: number;
    minAmount?: string;
    minAmountRaw?: string;
  } = {}) {
    super(message);
    this.name = 'FXError';
    this.code = opts.code;
    this.status = opts.status;
    this.minAmount = opts.minAmount;
    this.minAmountRaw = opts.minAmountRaw;
  }
}

/* ─── Intent EIP-712 (Sera settlement contract on Sepolia) ──────────────── */

const SERA_INTENT_TYPES: Record<string, TypedDataField[]> = {
  Intent: [
    { name: 'taker', type: 'address' },
    { name: 'inputToken', type: 'address' },
    { name: 'outputToken', type: 'address' },
    { name: 'maxInputAmount', type: 'uint256' },
    { name: 'minOutputAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'initialDepositAmount', type: 'uint256' },
    { name: 'uuid', type: 'uint256' },
    { name: 'deadline', type: 'uint48' },
  ],
};

// Sera settlement contract on Sepolia (dev-app.sera.cx). Sourced from
// GET /config — `verifyingContract` must match `sera_address` exactly or the
// EIP-712 signature will not recover the payer's address.
// Hardcoded as a fast-path default; the real config is fetched lazily below.
const SERA_DOMAIN_SEPOLIA: TypedDataDomain = {
  name: 'Sera',
  version: '1',
  chainId: 11155111,
  verifyingContract: '0x83475A1bD98a8DC2DCd507A747e4DC85da241D6e',
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function toBaseUnits(amountHuman: string, decimals: number): string {
  const [whole, frac = ''] = amountHuman.trim().split('.');
  if (!/^[0-9]+$/.test(whole || '0') || (frac && !/^[0-9]*$/.test(frac))) {
    throw new Error(`Invalid amount: ${amountHuman}`);
  }
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${whole || '0'}${fracPadded}`.replace(/^0+(?=\d)/, '');
  return combined === '' ? '0' : combined;
}

function fromBaseUnits(amountBase: string, decimals: number): string {
  if (!/^[0-9]+$/.test(amountBase)) return '0';
  if (decimals === 0) return amountBase;
  const padded = amountBase.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

/* ─── Service ───────────────────────────────────────────────────────────── */

class FXServiceImpl {
  private tokens: SeraToken[] = [];
  private tokensBySymbol = new Map<string, SeraToken>();
  private markets: SeraMarket[] = [];
  private lastMarketFetch = 0;
  private readonly marketCacheTTL = 60_000;

  async initialize(): Promise<void> {
    try {
      await this.refreshMarkets();
    } catch (e) {
      console.error('[FXService] initialize failed:', e);
    }
  }

  async refreshMarkets(force = false): Promise<{ markets: SeraMarket[]; tokens: SeraToken[] }> {
    const now = Date.now();
    if (!force && this.markets.length > 0 && now - this.lastMarketFetch < this.marketCacheTTL) {
      return { markets: this.markets, tokens: this.tokens };
    }

    const res = await fetch('/api/sera/markets', { cache: 'no-store' });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Sera markets fetch returned non-JSON (${res.status}): ${text.slice(0, 120)}`,
      );
    }
    if (!res.ok) {
      const err = parsed as { error?: string };
      throw new Error(err.error || `Sera markets fetch failed (${res.status})`);
    }
    const data = parsed as { markets: SeraMarket[]; tokens: SeraToken[] };

    this.markets = data.markets || [];
    this.tokens = data.tokens || [];
    this.tokensBySymbol = new Map(
      this.tokens.map(t => [t.symbol.toUpperCase(), t]),
    );
    this.lastMarketFetch = now;
    return { markets: this.markets, tokens: this.tokens };
  }

  private requireToken(symbol: string): SeraToken {
    const t = this.tokensBySymbol.get(symbol.toUpperCase());
    if (!t) {
      throw new Error(
        `Unknown token symbol: ${symbol}. Known: ${[...this.tokensBySymbol.keys()].join(', ') || '(none)'}`,
      );
    }
    return t;
  }

  /**
   * Get a real Sera quote.
   *
   * @param inputSymbol   token to pay with (symbol, e.g. "USDC")
   * @param outputSymbol  token merchant receives (symbol)
   * @param inputAmount   human-readable amount (e.g. "100.50")
   * @param ownerAddress  payer address (signs the Intent)
   * @param recipient     where the output tokens land (usually merchant address)
   * @param slippageBps   informational only — Sera enforces minOutputAmount server-side
   */
  async getQuote(
    inputSymbol: string,
    outputSymbol: string,
    inputAmount: string,
    ownerAddress: string,
    recipient: string,
    slippageBps = 50,
  ): Promise<FXQuote> {
    if (this.tokens.length === 0) {
      await this.refreshMarkets();
    }

    const input = this.requireToken(inputSymbol);
    const output = this.requireToken(outputSymbol);
    const fromAmountBase = toBaseUnits(inputAmount, input.decimals);
    const expiration = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes

    const res = await fetch('/api/sera/swap/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_token: input.address,
        to_token: output.address,
        from_amount: fromAmountBase,
        owner_address: ownerAddress,
        recipient,
        expiration,
        gas_mode: 'receive_less',
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof body?.error === 'string'
        ? body.error
        : `Quote failed (${res.status})`;
      throw new FXError(msg, {
        code: body?.error_code,
        status: res.status,
        minAmount: body?.min_amount,
        minAmountRaw: body?.min_amount_raw,
      });
    }

    const envelope = body as SeraQuoteEnvelope;
    const minOutputBase = envelope.route_params?.minOutputAmount ?? '0';

    // Sera returns 200 with minOutputAmount="0" when no executable route exists
    // at the requested size; POST /swap will then reject. Treat as NO_LIQUIDITY
    // up-front so the UI can route the user to a different input token.
    if (minOutputBase === '0' || minOutputBase === '0x0') {
      throw new FXError('No liquidity for this route at the requested size.', {
        code: 'NO_LIQUIDITY',
        status: 200,
      });
    }

    return {
      inputToken: input.symbol,
      outputToken: output.symbol,
      inputAmount,
      estimatedOutput: fromBaseUnits(minOutputBase, output.decimals),
      minOutput: fromBaseUnits(minOutputBase, output.decimals),
      slippageBps,
      timestamp: Date.now(),
      expiresAt: envelope.expires_at * 1000,
      route: { direct: true, hops: [input.symbol, output.symbol] },
      quoteUuid: envelope.uuid,
      routeParams: envelope.route_params,
      feeBreakdown: envelope.fee_breakdown,
      permit: envelope.permit,
      intentDomain: SERA_DOMAIN_SEPOLIA,
      intentTypes: SERA_INTENT_TYPES,
      intentMessage: envelope.route_params as unknown as Record<string, unknown>,
    };
  }

  /**
   * List output tokens reachable from a given input symbol. Sera handles
   * multi-hop server-side, so we expose every other discovered token.
   */
  getAvailableOutputTokens(inputSymbol: string): string[] {
    if (this.tokens.length === 0) return [];
    const input = inputSymbol.toUpperCase();
    return this.tokens
      .map(t => t.symbol.toUpperCase())
      .filter(s => s !== input)
      .sort();
  }

  async executeSwap(req: FXExecuteRequest): Promise<FXExecuteResult> {
    try {
      const res = await fetch('/api/sera/swap/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: req.quote.quoteUuid,
          signature: req.signature,
          permit_signature: req.permitSignature,
          permit_deadline: req.permitDeadline,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          inputAmount: req.quote.inputAmount,
          outputAmount: '0',
          error: body.error || `Execute failed (${res.status})`,
          errorCode: body.error_code,
        };
      }

      return {
        success: true,
        tradeId: body.trade_id ?? body.tradeId,
        txHash: body.tx_hash ?? body.txHash,
        inputAmount: req.quote.inputAmount,
        outputAmount: req.quote.estimatedOutput,
      };
    } catch (e) {
      return {
        success: false,
        inputAmount: req.quote.inputAmount,
        outputAmount: '0',
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  }

  getTokens(): SeraToken[] {
    return [...this.tokens];
  }

  getTokenBySymbol(symbol: string): SeraToken | undefined {
    return this.tokensBySymbol.get(symbol.toUpperCase());
  }

  /**
   * Precompute which tokens in the payer's wallet can actually pay this
   * invoice via Sera. Server batches /swap/quote/batch and filters out
   * NO_LIQUIDITY / AMOUNT_BELOW_MIN / INSUFFICIENT_OUTPUT up-front so the UI
   * can render a balance-aware token picker without sequential round-trips.
   *
   * `candidates` should be the payer's known token balances (symbol or
   * address); omit it for discovery mode (server probes every paired token).
   */
  async getPayableTokens(args: {
    payer: string;
    recipient: string;
    toToken: string;       // symbol or 0x… address of merchant currency
    toAmount: string;      // human-readable
    candidates?: Array<string | { address?: string; symbol?: string; balanceRaw?: string }>;
  }): Promise<PayableTokensResponse> {
    const candidates = args.candidates?.map(c =>
      typeof c === 'string'
        ? c
        : { address: c.address, symbol: c.symbol, balance_raw: c.balanceRaw },
    );
    const res = await fetch('/api/sera/payable-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payer: args.payer,
        recipient: args.recipient,
        to_token: args.toToken,
        to_amount: args.toAmount,
        candidates,
      }),
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new FXError(body.error || `Payable-tokens lookup failed (${res.status})`, {
        status: res.status,
      });
    }
    return body as PayableTokensResponse;
  }
}

export interface PayableTokenRow {
  address: string;
  symbol: string;
  decimals: number;
  from_amount_raw: string;
  from_amount: string;
  min_output_raw: string;
  min_output: string;
  quote_uuid: string;
  expires_at: number;
  sufficient_balance: boolean;
  balance_raw?: string;
}

export interface PayableTokensResponse {
  to_token: {
    address: string;
    symbol: string;
    decimals: number;
    amount: string;
    amount_raw: string;
  };
  direct: (PayableTokenRow & { direct: true }) | null;
  payable: PayableTokenRow[];
  unpayable: Array<{ address: string; symbol: string; reason: string; message?: string }>;
  fetched_at: number;
  quotes_expire_at: number | null;
}

let fxService: FXServiceImpl | null = null;

export function getFXService(): FXServiceImpl {
  if (!fxService) {
    fxService = new FXServiceImpl();
  }
  return fxService;
}

export async function initializeFXService(): Promise<void> {
  await getFXService().initialize();
}
