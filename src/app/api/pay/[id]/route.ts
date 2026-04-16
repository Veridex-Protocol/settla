import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        // Find payment link by shortCode (the [id] in URL is the shortCode)
        const paymentLink = await prisma.paymentLink.findFirst({
            where: {
                OR: [
                    { shortCode: id },
                    { id: id },
                ],
            },
            include: {
                business: {
                    select: {
                        name: true,
                        // VDX-API-005: walletAddress removed — not needed for payment page
                    },
                },
                _count: {
                    select: { transactions: true },
                },
            },
        });

        if (!paymentLink) {
            return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
        }

        // VDX-API-005: Return only minimum fields needed for the payment page.
        // Internal id excluded — only shortCode is the public identifier.
        const result = {
            paymentLink: {
                shortCode: paymentLink.shortCode,
                amount: Number(paymentLink.amount),
                currency: paymentLink.currency,
                status: paymentLink.status,
                expiresAt: paymentLink.expiresAt?.toISOString() || null,
                maxUses: paymentLink.maxUses,
                usedCount: paymentLink.usedCount,
                createdAt: paymentLink.createdAt.toISOString(),
                business: paymentLink.business,
            },
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to fetch payment link:', error);
        return NextResponse.json({ error: 'Failed to fetch payment link' }, { status: 500 });
    }
}
