import { NextResponse } from 'next/server';

/**
 * GET /api/sera/markets
 * Proxy to Sera REST API for active markets + token metadata.
 * Combines /markets and /tokens into a single response for the FX service.
 *
 * Cached for 60s server-side.
 */

const SERA_API_BASE = process.env.SERA_API_BASE_URL || 'https://api.sera.cx/api/v1';

let cache: { ts: number; payload: unknown } | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET() {
    try {
        if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
            return NextResponse.json(cache.payload, {
                headers: { 'x-cache': 'HIT' },
            });
        }

        const [marketsRes, tokensRes] = await Promise.all([
            fetch(`${SERA_API_BASE}/markets`, { cache: 'no-store' }),
            fetch(`${SERA_API_BASE}/tokens`, { cache: 'no-store' }),
        ]);

        if (!marketsRes.ok) {
            return NextResponse.json(
                { error: `Sera /markets returned ${marketsRes.status}` },
                { status: 502 },
            );
        }
        if (!tokensRes.ok) {
            return NextResponse.json(
                { error: `Sera /tokens returned ${tokensRes.status}` },
                { status: 502 },
            );
        }

        const marketsData = await marketsRes.json();
        const tokensData = await tokensRes.json();

        // Sera /markets returns shape: { markets: [...] } OR an array directly — normalize.
        const markets = Array.isArray(marketsData)
            ? marketsData
            : marketsData.markets || marketsData.data || [];
        const tokens = Array.isArray(tokensData)
            ? tokensData
            : tokensData.tokens || tokensData.data || [];

        const payload = { markets, tokens };
        cache = { ts: Date.now(), payload };

        return NextResponse.json(payload, { headers: { 'x-cache': 'MISS' } });
    } catch (error) {
        console.error('[SERA_MARKETS]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch Sera markets' },
            { status: 500 },
        );
    }
}
