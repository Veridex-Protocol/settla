import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leaderboard/opt-in
 * Toggle user's leaderboard opt-in status
 */
export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { optIn } = await request.json();

        await db.user.update({
            where: { id: authUser.id },
            data: { showOnLeaderboard: Boolean(optIn) },
        });

        return NextResponse.json({
            success: true,
            optedIn: Boolean(optIn),
        });
    } catch (error) {
        console.error('[LEADERBOARD OPT-IN] Error:', error);
        return NextResponse.json({ error: 'Failed to update opt-in status' }, { status: 500 });
    }
}
