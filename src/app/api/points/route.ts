import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/points
 * Get user's points balance and history
 */
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;

        // Fetch user balance and full history
        const [userData, history] = await Promise.all([
            db.user.findUnique({
                where: { id: userId },
                select: { seraPoints: true },
            }),
            db.pointTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 100, // Limit to last 100 transactions
            }),
        ]);

        // Calculate totals
        const totalEarned = history
            .filter((tx: typeof history[number]) => tx.amount > 0)
            .reduce((sum: number, tx: typeof history[number]) => sum + tx.amount, 0);

        const totalSpent = history
            .filter((tx: typeof history[number]) => tx.amount < 0)
            .reduce((sum: number, tx: typeof history[number]) => sum + tx.amount, 0);

        return NextResponse.json({
            balance: userData?.seraPoints || 0,
            history,
            totalEarned,
            totalSpent: Math.abs(totalSpent),
        });
    } catch (error) {
        console.error('[POINTS API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch points' },
            { status: 500 }
        );
    }
}
