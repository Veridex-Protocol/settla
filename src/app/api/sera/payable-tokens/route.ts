/**
 * POST /api/sera/payable-tokens
 *
 * Precompute which tokens in a payer's wallet can actually settle a given
 * merchant invoice via Sera. We do this server-side so the UI can render an
 * already-filtered, balance-aware picker without each tap firing a fresh
 * Sera quote round-trip.
 *
 * Flow:
 *  1. Load Sera /tokens + /markets (60s in-process cache).
 *  2. Resolve the merchant currency (symbol or address) and required amount.
 *  3. Build a candidate set from the payer's known balances (intersected with
 *     tokens that share a market with the output token). If the caller does
 *     not supply candidates we probe every directly-paired token — discovery
 *     mode, useful for debugging the testnet book.
 *  4. Size each candidate's `from_amount` using a best-effort FX rate
 *     (1:1 fallback for stable→stable on Sepolia) with a 5% buffer.
 *  5. Batch quotes 50/req against Sera `/swap/quote/batch`, owner-bound to the
 *     payer so each `ok` item carries a real, signable UUID (~30s TTL).
 *  6. Partition results: payable (ok && minOutputAmount >= required) vs
 *     unpayable (with a typed reason).
 *
 * This route never holds private keys — it just relays REST calls.
 */

import { NextResponse } from 'next/server';

const SERA_API_BASE = process.env.SERA_API_BASE_URL || 'https://api.sera.cx/api/v1';

const FROM_BUFFER_BPS = 500;   // 5% over-quote to absorb FX drift before signing
const QUOTE_TTL_SLACK_MS = 5_000;
const BATCH_SIZE = 50;
const RESULT_CACHE_TTL_MS = 25_000;

interface SeraTokenLite {
    address: string;
    symbol: string;
    decimals: number;
    min_trade_amount_raw?: string;
    min_trade_amount?: string;
}

interface SeraMarketLite {
    baseToken?: { address?: string; symbol?: string };
    quoteToken?: { address?: string; symbol?: string };
    active?: boolean;
    status?: string;
}

type RegistryCacheEntry = {
    fetchedAt: number;
    tokens: SeraTokenLite[];
    markets: SeraMarketLite[];
};

const REGISTRY_TTL_MS = 60_000;
let registryCache: RegistryCacheEntry | null = null;
async function loadRegistry(): Promise<RegistryCacheEntry> {
    const now = Date.now();
    if (registryCache && now - registryCache.fetchedAt < REGISTRY_TTL_MS) {
        return registryCache;
    }
    const [tokensRes, marketsRes] = await Promise.all([
        fetch(`${SERA_API_BASE}/tokens`, { cache: 'no-store' }),
        fetch(`${SERA_API_BASE}/markets`, { cache: 'no-store' }),
    ]);
    if (!tokensRes.ok) throw new Error(`Sera /tokens failed: ${tokensRes.status}`);
    if (!marketsRes.ok) throw new Error(`Sera /markets failed: ${marketsRes.status}`);
    const tokensBody = await tokensRes.json();
    const marketsBody = await marketsRes.json();
    const tokens: SeraTokenLite[] = Array.isArray(tokensBody)
        ? tokensBody
        : (tokensBody.tokens || []);
    const markets: SeraMarketLite[] = Array.isArray(marketsBody)
        ? marketsBody
        : (marketsBody.markets || []);
    registryCache = { fetchedAt: now, tokens, markets };
    return registryCache;
}

const resultCache = new Map<string, { at: number; body: unknown }>();
function cacheKey(parts: Record<string, string>): string {
    return Object.entries(parts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v.toLowerCase()}`)
        .join('|');
}

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

/**
 * Compare two non-negative integer-string amounts. Returns -1, 0, or 1.
 */
function cmpBigStr(a: string, b: string): number {
    const aa = a.replace(/^0+/, '') || '0';
    const bb = b.replace(/^0+/, '') || '0';
    if (aa.length !== bb.length) return aa.length < bb.length ? -1 : 1;
    return aa < bb ? -1 : aa > bb ? 1 : 0;
}

/**
 * Apply a basis-point buffer to a base-units amount: out = ceil(amount * (10000 + bps) / 10000).
 */
function applyBufferBps(amountRaw: string, bufferBps: number): string {
    const a = BigInt(amountRaw);
    const num = a * BigInt(10_000 + bufferBps);
    const out = (num + 9_999n) / 10_000n;
    return out.toString();
}

/**
 * Best-effort cross-decimal scaling: scale a raw amount in `fromDecimals`
 * to its equivalent in `toDecimals`, assuming 1:1 value (true for
 * stable→stable on testnet; will be replaced by a real Sera FX rate when
 * available). We deliberately do not call /fx/rate here — Sera's REST
 * surface does not expose a public rate endpoint as of this build, and
 * batch-quote will surface the truth (or NO_LIQUIDITY) either way.
 */
function scaleDecimals(amountRaw: string, fromDecimals: number, toDecimals: number): string {
    const a = BigInt(amountRaw);
    if (toDecimals === fromDecimals) return a.toString();
    if (toDecimals > fromDecimals) {
        return (a * 10n ** BigInt(toDecimals - fromDecimals)).toString();
    }
    const div = 10n ** BigInt(fromDecimals - toDecimals);
    return ((a + div - 1n) / div).toString();
}

interface BatchQuoteItem {
    ok: boolean;
    quote?: {
        uuid: string;
        expires_at: number;
        route_params: {
            maxInputAmount: string;
            minOutputAmount: string;
            initialDepositAmount: string;
        };
    };
    error?: {
        code?: string;
        rejectionCategory?: string;
        message?: string;
    } | string;
}

interface PayableResponseRow {
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

interface UnpayableRow {
    address: string;
    symbol: string;
    reason: string;
    message?: string;
}

export async function POST(req: Request) {
    let body: {
        payer?: string;
        recipient?: string;
        to_token?: string;
        to_amount?: string;
        candidates?: Array<string | { address?: string; symbol?: string; balance_raw?: string }>;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { payer, recipient, to_token, to_amount } = body;
    if (!payer || !recipient || !to_token || !to_amount) {
        return NextResponse.json(
            { error: 'Missing required fields: payer, recipient, to_token, to_amount' },
            { status: 400 },
        );
    }

    let registry: RegistryCacheEntry;
    try {
        registry = await loadRegistry();
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Sera registry fetch failed' },
            { status: 502 },
        );
    }

    const tokensByAddr = new Map<string, SeraTokenLite>();
    const tokensBySym = new Map<string, SeraTokenLite>();
    for (const t of registry.tokens) {
        if (t.address) tokensByAddr.set(t.address.toLowerCase(), t);
        if (t.symbol) tokensBySym.set(t.symbol.toUpperCase(), t);
    }

    const resolveToken = (s: string): SeraTokenLite | undefined => {
        if (!s) return undefined;
        if (s.startsWith('0x') && s.length === 42) return tokensByAddr.get(s.toLowerCase());
        return tokensBySym.get(s.toUpperCase());
    };

    const outputToken = resolveToken(to_token);
    if (!outputToken) {
        return NextResponse.json(
            { error: `Unknown to_token: ${to_token}` },
            { status: 400 },
        );
    }

    let toAmountRaw: string;
    try {
        toAmountRaw = toBaseUnits(to_amount, outputToken.decimals);
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Invalid to_amount' },
            { status: 400 },
        );
    }

    // Build the set of tokens that share *any* market with the output token.
    // Sera handles multi-hop server-side, so direct-pair filtering is a lower
    // bound; we widen it to "any token in the registry" if the markets list
    // is incomplete (some envs return an empty array).
    const outAddrLower = outputToken.address.toLowerCase();
    const pairedAddrs = new Set<string>();
    for (const m of registry.markets) {
        const base = m.baseToken?.address?.toLowerCase();
        const quote = m.quoteToken?.address?.toLowerCase();
        if (!base || !quote) continue;
        if (base === outAddrLower) pairedAddrs.add(quote);
        else if (quote === outAddrLower) pairedAddrs.add(base);
    }
    const probeUniverse: SeraTokenLite[] = pairedAddrs.size > 0
        ? registry.tokens.filter(t => pairedAddrs.has(t.address.toLowerCase()))
        : registry.tokens;

    // Normalise client-supplied candidates (balances). Each entry can be a
    // bare symbol/address string or a structured row with balance_raw.
    const balanceByAddr = new Map<string, string>(); // address(lower) -> balance_raw
    let restrictToProvided = false;
    if (Array.isArray(body.candidates) && body.candidates.length > 0) {
        restrictToProvided = true;
        for (const c of body.candidates) {
            if (typeof c === 'string') {
                const tok = resolveToken(c);
                if (tok) balanceByAddr.set(tok.address.toLowerCase(), '');
            } else {
                const tok = c.address
                    ? tokensByAddr.get(c.address.toLowerCase())
                    : (c.symbol ? tokensBySym.get(c.symbol.toUpperCase()) : undefined);
                if (tok) balanceByAddr.set(tok.address.toLowerCase(), c.balance_raw || '');
            }
        }
    }

    const candidates = probeUniverse.filter(t => {
        if (t.address.toLowerCase() === outAddrLower) return false; // direct-pay handled separately
        if (!restrictToProvided) return true;
        return balanceByAddr.has(t.address.toLowerCase());
    });

    // Compute from_amount_raw per candidate. We over-quote by FROM_BUFFER_BPS
    // so a small FX drift between this precompute and the actual swap doesn't
    // push the user under their requested merchant payout.
    type Sized = {
        token: SeraTokenLite;
        fromAmountRaw: string;
        balanceRaw: string;
    };
    const sized: Sized[] = candidates.map(t => {
        const scaled = scaleDecimals(toAmountRaw, outputToken.decimals, t.decimals);
        let fromAmountRaw = applyBufferBps(scaled, FROM_BUFFER_BPS);
        if (t.min_trade_amount_raw && cmpBigStr(fromAmountRaw, t.min_trade_amount_raw) < 0) {
            // Bump just over the floor; Sera rejects amounts equal to the floor in some markets.
            fromAmountRaw = (BigInt(t.min_trade_amount_raw) + 1n).toString();
        }
        return {
            token: t,
            fromAmountRaw,
            balanceRaw: balanceByAddr.get(t.address.toLowerCase()) || '',
        };
    });

    // Check cache.
    const sortedCandidatesKey = sized
        .map(s => `${s.token.address.toLowerCase()}:${s.fromAmountRaw}`)
        .sort()
        .join(',');
    const key = cacheKey({
        payer,
        recipient,
        out: outputToken.address,
        amt: toAmountRaw,
        cands: sortedCandidatesKey,
    });
    const hit = resultCache.get(key);
    if (hit && Date.now() - hit.at < RESULT_CACHE_TTL_MS) {
        return NextResponse.json(hit.body, { headers: { 'x-cache': 'hit' } });
    }

    // Same-token short circuit: if the payer holds the output token directly,
    // emit a synthetic row so the UI can offer "Pay with USDC directly" without
    // routing through Sera.
    const directRow = (() => {
        if (!restrictToProvided) return null;
        const directBal = balanceByAddr.get(outAddrLower);
        if (directBal === undefined) return null;
        const sufficient = directBal ? cmpBigStr(directBal, toAmountRaw) >= 0 : true;
        return {
            address: outputToken.address,
            symbol: outputToken.symbol,
            decimals: outputToken.decimals,
            from_amount_raw: toAmountRaw,
            from_amount: fromBaseUnits(toAmountRaw, outputToken.decimals),
            min_output_raw: toAmountRaw,
            min_output: fromBaseUnits(toAmountRaw, outputToken.decimals),
            quote_uuid: '',
            expires_at: 0,
            sufficient_balance: sufficient,
            balance_raw: directBal || undefined,
            direct: true as const,
        };
    })();

    // Build batch payloads.
    const expiration = Math.floor(Date.now() / 1000) + 10 * 60;
    const requests = sized.map(s => ({
        from_token: s.token.address,
        to_token: outputToken.address,
        from_amount: s.fromAmountRaw,
        owner_address: payer,
        recipient,
        expiration,
        gas_mode: 'receive_less',
    }));

    const payable: PayableResponseRow[] = [];
    const unpayable: UnpayableRow[] = [];

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
        const slice = requests.slice(i, i + BATCH_SIZE);
        const sliceSized = sized.slice(i, i + BATCH_SIZE);
        let items: BatchQuoteItem[] = [];
        try {
            const res = await fetch(`${SERA_API_BASE}/swap/quote/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quotes: slice }),
                cache: 'no-store',
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                for (const s of sliceSized) {
                    unpayable.push({
                        address: s.token.address,
                        symbol: s.token.symbol,
                        reason: 'BATCH_FAILED',
                        message: typeof json?.error === 'string'
                            ? json.error
                            : `Sera batch ${res.status}`,
                    });
                }
                continue;
            }
            items = json.items || [];
        } catch (e) {
            for (const s of sliceSized) {
                unpayable.push({
                    address: s.token.address,
                    symbol: s.token.symbol,
                    reason: 'BATCH_FAILED',
                    message: e instanceof Error ? e.message : 'Network error',
                });
            }
            continue;
        }

        for (let j = 0; j < sliceSized.length; j++) {
            const s = sliceSized[j];
            const item = items[j];
            if (!item) {
                unpayable.push({
                    address: s.token.address,
                    symbol: s.token.symbol,
                    reason: 'BATCH_INCOMPLETE',
                });
                continue;
            }
            if (!item.ok || !item.quote) {
                const errObj = typeof item.error === 'string' ? { message: item.error } : (item.error || {});
                const reason = (errObj.code || errObj.rejectionCategory || 'UNKNOWN')
                    .toString()
                    .toUpperCase();
                unpayable.push({
                    address: s.token.address,
                    symbol: s.token.symbol,
                    reason,
                    message: errObj.message,
                });
                continue;
            }
            const minOut = item.quote.route_params.minOutputAmount;
            if (minOut === '0' || cmpBigStr(minOut, toAmountRaw) < 0) {
                unpayable.push({
                    address: s.token.address,
                    symbol: s.token.symbol,
                    reason: 'INSUFFICIENT_OUTPUT',
                    message: `min_output ${minOut} < required ${toAmountRaw}`,
                });
                continue;
            }
            const sufficientBalance = !s.balanceRaw
                ? true
                : cmpBigStr(s.balanceRaw, s.fromAmountRaw) >= 0;
            payable.push({
                address: s.token.address,
                symbol: s.token.symbol,
                decimals: s.token.decimals,
                from_amount_raw: s.fromAmountRaw,
                from_amount: fromBaseUnits(s.fromAmountRaw, s.token.decimals),
                min_output_raw: minOut,
                min_output: fromBaseUnits(minOut, outputToken.decimals),
                quote_uuid: item.quote.uuid,
                expires_at: item.quote.expires_at * 1000,
                sufficient_balance: sufficientBalance,
                balance_raw: s.balanceRaw || undefined,
            });
        }
    }

    // Most useful first: sufficient balance, then nearest min_output to the
    // required amount (less wasted spend).
    payable.sort((a, b) => {
        if (a.sufficient_balance !== b.sufficient_balance) {
            return a.sufficient_balance ? -1 : 1;
        }
        const da = BigInt(a.min_output_raw) - BigInt(toAmountRaw);
        const db = BigInt(b.min_output_raw) - BigInt(toAmountRaw);
        return da < db ? -1 : da > db ? 1 : 0;
    });

    const responseBody = {
        to_token: {
            address: outputToken.address,
            symbol: outputToken.symbol,
            decimals: outputToken.decimals,
            amount: to_amount,
            amount_raw: toAmountRaw,
        },
        direct: directRow,
        payable,
        unpayable,
        fetched_at: Date.now(),
        quotes_expire_at: payable.length > 0
            ? Math.min(...payable.map(p => p.expires_at)) - QUOTE_TTL_SLACK_MS
            : null,
    };

    resultCache.set(key, { at: Date.now(), body: responseBody });
    // Best-effort: keep the cache bounded.
    if (resultCache.size > 64) {
        const oldest = [...resultCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) resultCache.delete(oldest[0]);
    }

    return NextResponse.json(responseBody, { headers: { 'x-cache': 'miss' } });
}
