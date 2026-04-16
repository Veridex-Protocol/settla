import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type LeaderboardCategory = 'volume' | 'growth' | 'consistency' | 'conversion';

/**
 * GET /api/leaderboard
 * Get leaderboard entries for a category
 */
export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const category = (request.nextUrl.searchParams.get('category') || 'volume') as LeaderboardCategory;

        // Get user's opt-in status
        const user = await db.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                showOnLeaderboard: true,
                merchantTier: true,
                totalVolume: true,
                currentStreak: true,
                business: {
                    select: { name: true },
                },
            },
        });

        // Get all users who have opted in
        const optedInUsers = await db.user.findMany({
            where: { showOnLeaderboard: true },
            select: {
                id: true,
                merchantTier: true,
                totalVolume: true,
                currentStreak: true,
                business: {
                    select: { name: true },
                },
            },
            orderBy: getOrderByForCategory(category),
            take: 20,
        });

        // Transform to leaderboard entries
        const entries = optedInUsers.map((u: typeof optedInUsers[number], index: number) => ({
            rank: index + 1,
            displayName: getAnonymizedName(u.business?.name || 'Anonymous'),
            value: getValueForCategory(u, category),
            tier: u.merchantTier,
            isCurrentUser: u.id === authUser.id,
        }));

        // Get user's rank if not in top 20
        let userRank = null;
        if (user && !entries.some((e: typeof entries[number]) => e.isCurrentUser)) {
            // Calculate user's approximate rank
            const usersAbove = await db.user.count({
                where: {
                    showOnLeaderboard: true,
                    ...getWhereForCategory(category, user),
                },
            });

            userRank = {
                rank: usersAbove + 1,
                displayName: user.business?.name || 'Your Business',
                value: getValueForCategory(user, category),
                tier: user.merchantTier,
                isCurrentUser: true,
            };
        }

        return NextResponse.json({
            entries: entries.slice(0, 10),
            optedIn: user?.showOnLeaderboard || false,
            userRank,
        });
    } catch (error) {
        console.error('[LEADERBOARD GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getOrderByForCategory(category: LeaderboardCategory): any {
    switch (category) {
        case 'volume':
            return { totalVolume: 'desc' };
        case 'consistency':
            return { currentStreak: 'desc' };
        case 'growth':
        case 'conversion':
        default:
            return { totalVolume: 'desc' }; // Default to volume for now
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getValueForCategory(user: any, category: LeaderboardCategory): number {
    switch (category) {
        case 'volume':
            return Number(user.totalVolume || 0);
        case 'consistency':
            return user.currentStreak || 0;
        case 'growth':
            return Math.floor(Math.random() * 50) + 10; // Mock data
        case 'conversion':
            return Math.floor(Math.random() * 30) + 20; // Mock data
        default:
            return 0;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWhereForCategory(category: LeaderboardCategory, user: any): any {
    switch (category) {
        case 'volume':
            return { totalVolume: { gt: user.totalVolume } };
        case 'consistency':
            return { currentStreak: { gt: user.currentStreak } };
        default:
            return {};
    }
}

function getAnonymizedName(name: string): string {
    if (!name || name.length <= 4) return name;
    return name.slice(0, 2) + '***' + name.slice(-2);
}
