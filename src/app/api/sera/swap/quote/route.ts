import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sera/swap/quote
 * Proxy to Sera POST /swap/quote.
 * Returns the unmodified quote envelope (uuid, route_params, fee_breakdown,
 * expires_at, permit).
 *
 * Auth: none. Payment authorization is enforced by the EIP-712 Intent
 * signature the payer produces over the returned route_params, which Sera
 * verifies at execute time. Anonymous payers must be able to fetch quotes
 * from the public /pay/[id] flow.
 */

const SERA_API_BASE = process.env.SERA_API_BASE_URL || 'https://api.sera.cx/api/v1';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const required = [
            'from_token',
            'to_token',
            'from_amount',
            'owner_address',
            'recipient',
            'expiration',
        ];
        for (const k of required) {
            if (!body[k]) {
                return NextResponse.json(
                    { error: `Missing required field: ${k}` },
                    { status: 400 },
                );
            }
        }

        const upstream = await fetch(`${SERA_API_BASE}/swap/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_token: body.from_token,
                to_token: body.to_token,
                from_amount: body.from_amount,
                owner_address: body.owner_address,
                recipient: body.recipient,
                expiration: body.expiration,
                gas_mode: body.gas_mode || 'receive_less',
            }),
            cache: 'no-store',
        });

        const data = await upstream.json().catch(() => null);

        if (!upstream.ok) {
            // Sera error envelopes seen in the wild:
            //   1. Typed:       { detail: { detail: "...", error_code: "NO_LIQUIDITY" } }
            //   2. Snake-case:  { detail: { success: false, error: "no_liquidity" } }
            //   3. Plain:       { detail: "..." }
            // Some 4xx variants also include `min_amount` / `min_amount_raw` (AMOUNT_BELOW_MIN).
            const inner = data?.detail;
            const innerDetail = typeof inner === 'object' && inner !== null ? inner : null;
            const snakeError =
                typeof innerDetail?.error === 'string' ? (innerDetail.error as string) : undefined;
            const rawCode =
                (innerDetail?.error_code as string | undefined) ||
                (innerDetail?.code as string | undefined) ||
                (innerDetail?.rejectionCategory as string | undefined) ||
                snakeError;
            const errorCode = rawCode ? rawCode.toUpperCase() : undefined;
            const message =
                (innerDetail?.detail as string | undefined) ||
                (typeof inner === 'string' ? inner : undefined) ||
                (snakeError ? `Sera: ${snakeError}` : undefined) ||
                `Sera quote failed (${upstream.status})`;
            return NextResponse.json(
                {
                    error: message,
                    error_code: errorCode,
                    min_amount: innerDetail?.min_amount,
                    min_amount_raw: innerDetail?.min_amount_raw,
                    upstream: data,
                },
                { status: upstream.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[SERA_QUOTE]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Quote failed' },
            { status: 500 },
        );
    }
}
