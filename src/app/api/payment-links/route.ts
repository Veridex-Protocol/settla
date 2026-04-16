import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateShortCode } from '@/lib/utils';
import { updatePaymentLinkGoals } from '@/lib/services/goal-service';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { business: true },
        });

        if (!user?.businessId) {
            return NextResponse.json({ error: 'No business found' }, { status: 404 });
        }

        const paymentLinks = await prisma.paymentLink.findMany({
            where: { businessId: user.businessId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { transactions: true },
                },
            },
        });

        // Transform to include uses count
        const linksWithUses = paymentLinks.map((link: typeof paymentLinks[number]) => ({
            ...link,
            uses: link._count.transactions,
        }));

        return NextResponse.json({ paymentLinks: linksWithUses });
    } catch (error) {
        console.error('Failed to fetch payment links:', error);
        return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { business: true },
        });

        if (!user?.businessId) {
            return NextResponse.json({ error: 'No business found' }, { status: 404 });
        }

        const body = await req.json();
        const { amount, currency, maxUses, expiresIn } = body;

        if (!amount || !currency) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Calculate expiration date
        let expiresAt: Date | null = null;
        if (expiresIn && expiresIn !== 'never') {
            const now = new Date();
            const days = parseInt(expiresIn.replace('d', ''));
            if (!isNaN(days)) {
                expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            }
        }

        // Generate unique short code
        const shortCode = `pay-${generateShortCode(8)}`;

        const paymentLink = await prisma.paymentLink.create({
            data: {
                businessId: user.businessId,
                shortCode,
                amount: parseFloat(amount),
                currency,
                maxUses: maxUses ? parseInt(maxUses) : null,
                expiresAt,
                status: 'active',
            },
        });

        // Update payment link goal progress (Phase 2 gamification)
        try {
            await updatePaymentLinkGoals(session.user.id);
        } catch (goalError) {
            console.error('Failed to update payment link goals:', goalError);
        }

        return NextResponse.json({ paymentLink }, { status: 201 });
    } catch (error) {
        console.error('Failed to create payment link:', error);
        return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { business: true },
        });

        if (!user?.businessId) {
            return NextResponse.json({ error: 'No business found' }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Payment link ID required' }, { status: 400 });
        }

        // Verify ownership and check if link has been used
        const paymentLink = await prisma.paymentLink.findFirst({
            where: { id, businessId: user.businessId },
            include: {
                _count: {
                    select: { transactions: true },
                },
            },
        });

        if (!paymentLink) {
            return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
        }

        // Check if payment link has been used (has transactions or usedCount > 0)
        const hasBeenUsed = paymentLink._count.transactions > 0 || paymentLink.usedCount > 0;
        
        if (hasBeenUsed) {
            return NextResponse.json({ 
                error: 'Cannot delete a payment link that has been used. You can disable it instead.',
                code: 'LINK_HAS_TRANSACTIONS'
            }, { status: 400 });
        }

        await prisma.paymentLink.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete payment link:', error);
        return NextResponse.json({ error: 'Failed to delete payment link' }, { status: 500 });
    }
}

// PATCH /api/payment-links - Disable or update a payment link
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { business: true },
        });

        if (!user?.businessId) {
            return NextResponse.json({ error: 'No business found' }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Payment link ID required' }, { status: 400 });
        }

        const body = await req.json();
        const { status } = body;

        if (!status || !['active', 'disabled'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status. Must be "active" or "disabled"' }, { status: 400 });
        }

        // Verify ownership
        const paymentLink = await prisma.paymentLink.findFirst({
            where: { id, businessId: user.businessId },
        });

        if (!paymentLink) {
            return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
        }

        const updatedLink = await prisma.paymentLink.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json({ paymentLink: updatedLink });
    } catch (error) {
        console.error('Failed to update payment link:', error);
        return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 });
    }
}
