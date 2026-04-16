import { NextRequest, NextResponse } from "next/server";
import { runDigestJob } from "@/lib/services/digest-service";

// Vercel Cron configuration - single daily cron handles all frequencies
// vercel.json: { "path": "/api/cron/digest", "schedule": "0 8 * * *" }
// Runs daily at 8am UTC, determines which digests to send based on current date

/**
 * Determine which digest frequencies to run based on current date
 */
function getFrequenciesToRun(): ("daily" | "weekly" | "monthly")[] {
    const now = new Date();
    const frequencies: ("daily" | "weekly" | "monthly")[] = ["daily"];
    
    // Monday = 1 in getDay()
    if (now.getUTCDay() === 1) {
        frequencies.push("weekly");
    }
    
    // First day of month
    if (now.getUTCDate() === 1) {
        frequencies.push("monthly");
    }
    
    return frequencies;
}

/**
 * GET /api/cron/digest
 * Triggered by Vercel Cron daily at 8am UTC
 * Automatically runs appropriate digests based on current date
 */
export async function GET(request: NextRequest) {
    // VDX-API-003: Always require Bearer token auth, regardless of environment.
    // Never trust the spoofable x-vercel-cron header from external sources.
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const explicitFrequency = searchParams.get("frequency") as "daily" | "weekly" | "monthly" | null;

    // If frequency specified, run only that one (for manual triggers)
    // Otherwise, auto-determine based on current date
    const frequencies = explicitFrequency 
        ? [explicitFrequency]
        : getFrequenciesToRun();

    if (explicitFrequency && !["daily", "weekly", "monthly"].includes(explicitFrequency)) {
        return NextResponse.json(
            { error: "Invalid frequency. Must be daily, weekly, or monthly." },
            { status: 400 }
        );
    }

    try {
        const results: Record<string, unknown> = {};
        
        for (const frequency of frequencies) {
            const result = await runDigestJob(frequency);
            results[frequency] = result.success ? result.results : { error: result.error };
        }

        return NextResponse.json({
            success: true,
            message: `Digest jobs completed: ${frequencies.join(", ")}`,
            frequencies,
            results,
        });
    } catch (error) {
        console.error("[CRON_DIGEST]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/cron/digest
 * Manual trigger for testing (requires auth)
 */
export async function POST(request: NextRequest) {
    // VDX-API-003: Always require Bearer token auth, regardless of environment.
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const frequency = body.frequency as "daily" | "weekly" | "monthly";

        if (!frequency || !["daily", "weekly", "monthly"].includes(frequency)) {
            return NextResponse.json(
                { error: "Invalid frequency. Must be daily, weekly, or monthly." },
                { status: 400 }
            );
        }

        const result = await runDigestJob(frequency);

        return NextResponse.json({
            ...result,
        });
    } catch (error) {
        console.error("[CRON_DIGEST_POST]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
