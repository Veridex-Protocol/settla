import { NextResponse } from 'next/server';

/**
 * DEPRECATED — the old mock /api/swap endpoint has been removed.
 *
 * Use these instead (all backed by the real Sera REST API):
 *   GET  /api/sera/markets        — token + market discovery
 *   POST /api/sera/swap/quote     — Sera POST /swap/quote
 *   POST /api/sera/swap/execute   — Sera POST /swap (signed)
 */
export function GET() {
    return NextResponse.json(
        {
            error: 'Endpoint removed. Use /api/sera/markets, /api/sera/swap/quote, and /api/sera/swap/execute.',
        },
        { status: 410 },
    );
}

export function POST() {
    return NextResponse.json(
        {
            error: 'Endpoint removed. Use /api/sera/swap/quote then /api/sera/swap/execute.',
        },
        { status: 410 },
    );
}
