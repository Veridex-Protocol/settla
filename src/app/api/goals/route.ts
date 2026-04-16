import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/goals
 * Get user's goals
 */
export async function GET() {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const goals = await db.goal.findMany({
            where: { userId: authUser.id },
            orderBy: [
                { achieved: 'asc' },
                { deadline: 'asc' },
            ],
        });

        return NextResponse.json({
            goals: goals.map((g: typeof goals[number]) => ({
                id: g.id,
                type: g.type,
                title: g.title,
                targetValue: Number(g.targetValue),
                currentValue: Number(g.currentValue),
                deadline: g.deadline.toISOString(),
                achieved: g.achieved,
                achievedAt: g.achievedAt?.toISOString() || null,
            })),
        });
    } catch (error) {
        console.error('[GOALS GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
    }
}

/**
 * POST /api/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthenticatedUser();
        if (!authUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, title, targetValue, deadline } = await request.json();

        if (!type || !title || !targetValue || !deadline) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate goal type
        const validTypes = ['revenue', 'invoices', 'payment_links', 'team'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: 'Invalid goal type' },
                { status: 400 }
            );
        }

        const goal = await db.goal.create({
            data: {
                userId: authUser.id,
                type,
                title,
                targetValue: parseFloat(targetValue),
                deadline: new Date(deadline),
            },
        });

        return NextResponse.json({
            goal: {
                id: goal.id,
                type: goal.type,
                title: goal.title,
                targetValue: Number(goal.targetValue),
                currentValue: Number(goal.currentValue),
                deadline: goal.deadline.toISOString(),
                achieved: goal.achieved,
            },
        });
    } catch (error) {
        console.error('[GOALS POST] Error:', error);
        return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
    }
}
