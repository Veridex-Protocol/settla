import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/sera/swap/execute
 * Proxy to Sera POST /swap.
 *
 * Body:
 *   uuid              — quote id from /api/sera/swap/quote
 *   signature         — EIP-712 Intent signature over quote.route_params
 *   permit_signature  — EIP-712 permit signature (required when quote.permit != null)
 *   permit_deadline   — required alongside permit_signature
 *
 * Auth: none. Authorization is the payer's EIP-712 Intent signature; Sera
 * rejects any execute call whose signature doesn't match the quote UUID's
 * owner_address, so this endpoint can be safely public for /pay/[id].
 */

const SERA_API_BASE = process.env.SERA_API_BASE_URL || 'https://api.sera.cx/api/v1';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.uuid || !body.signature) {
            return NextResponse.json(
                { error: 'Missing required field: uuid, signature' },
                { status: 400 },
            );
        }

        const upstream = await fetch(`${SERA_API_BASE}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uuid: body.uuid,
                signature: body.signature,
                permit_signature: body.permit_signature,
                permit_deadline: body.permit_deadline,
            }),
            cache: 'no-store',
        });

        const data = await upstream.json().catch(() => null);

        if (!upstream.ok) {
            // Sera error envelopes (see /api/sera/swap/quote for full list):
            //   1. { detail: { detail, error_code } }
            //   2. { detail: { success: false, error: "no_liquidity" } }
            //   3. { detail: "..." }
            const inner = data?.detail;
            const innerDetail = typeof inner === 'object' && inner !== null ? inner : null;
            const snakeError =
                typeof innerDetail?.error === 'string' ? (innerDetail.error as string) : undefined;
            const rawCode =
                (innerDetail?.error_code as string | undefined) ||
                (innerDetail?.code as string | undefined) ||
                snakeError;
            const errorCode = rawCode ? rawCode.toUpperCase() : undefined;
            const message =
                (innerDetail?.detail as string | undefined) ||
                (typeof inner === 'string' ? inner : undefined) ||
                (snakeError ? `Sera: ${snakeError}` : undefined) ||
                `Sera swap failed (${upstream.status})`;
            return NextResponse.json(
                {
                    error: message,
                    error_code: errorCode,
                    upstream: data,
                },
                { status: upstream.status },
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[SERA_EXECUTE]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Execute failed' },
            { status: 500 },
        );
    }
}
