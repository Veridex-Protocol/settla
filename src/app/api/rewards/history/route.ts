import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rewards/history
 * Get user's reward redemption history
 */
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;

        // Fetch redemption notifications
        const notifications = await db.notification.findMany({
            where: {
                userId,
                type: 'reward_redeemed',
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        const redemptions = notifications.map((n: typeof notifications[number]) => {
            const metadata = n.metadata as {
                rewardId?: string;
                rewardName?: string;
                pointsCost?: number;
                status?: string;
            } | null;

            return {
                id: n.id,
                rewardId: metadata?.rewardId || 'unknown',
                rewardName: metadata?.rewardName || n.title.replace('Redeemed: ', ''),
                pointsCost: metadata?.pointsCost || 0,
                redeemedAt: n.createdAt.toISOString(),
                status: metadata?.status || 'completed',
            };
        });

        return NextResponse.json({ redemptions });
    } catch (error) {
        console.error('[REWARDS HISTORY] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch redemption history' },
            { status: 500 }
        );
    }
}
