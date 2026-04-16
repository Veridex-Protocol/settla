import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { REWARD_CATALOG } from '@/lib/constants/points';
import { spendPoints } from '@/lib/services/achievement-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rewards/redeem
 * Redeem a reward using Sera Points
 */
export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;
        const { rewardId } = await request.json();

        // Find the reward in catalog
        const reward = REWARD_CATALOG.find(r => r.id === rewardId);
        if (!reward) {
            return NextResponse.json(
                { error: 'Reward not found' },
                { status: 404 }
            );
        }

        if (!reward.active) {
            return NextResponse.json(
                { error: 'Reward is not available' },
                { status: 400 }
            );
        }

        // Attempt to spend points
        const success = await spendPoints(
            userId,
            reward.pointsCost,
            'redeemed_reward',
            { rewardId: reward.id, rewardName: reward.name }
        );

        if (!success) {
            return NextResponse.json(
                { error: 'Insufficient points' },
                { status: 400 }
            );
        }

        // Create redemption record
        const redemption = await db.notification.create({
            data: {
                userId,
                type: 'reward_redeemed',
                title: `Redeemed: ${reward.name}`,
                message: `You redeemed ${reward.name} for ${reward.pointsCost} points`,
                metadata: {
                    rewardId: reward.id,
                    rewardName: reward.name,
                    pointsCost: reward.pointsCost,
                    category: reward.category,
                    status: 'pending',
                },
            },
        });

        // TODO: Implement actual reward fulfillment logic
        // e.g., apply fee credits to account, grant feature access, etc.

        return NextResponse.json({
            success: true,
            redemption: {
                id: redemption.id,
                rewardId: reward.id,
                rewardName: reward.name,
                pointsCost: reward.pointsCost,
                redeemedAt: redemption.createdAt.toISOString(),
                status: 'pending',
            },
        });
    } catch (error) {
        console.error('[REWARDS REDEEM] Error:', error);
        return NextResponse.json(
            { error: 'Failed to redeem reward' },
            { status: 500 }
        );
    }
}
