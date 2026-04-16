import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * VDX-AUTH-004: Server-side WebAuthn challenge generation for Sera dashboard login.
 *
 * Challenges are stored in-memory with a 5-minute TTL.
 * Multi-instance production should replace with Redis or DB-backed store.
 */

interface ChallengeEntry {
  challenge: Buffer;
  createdAt: number;
}

const challenges = new Map<string, ChallengeEntry>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CHALLENGE_BYTES = 32;
const MAX_CHALLENGES = 10_000;

function sweepExpired(): void {
  const now = Date.now();
  for (const [id, entry] of challenges) {
    if (now - entry.createdAt > CHALLENGE_TTL_MS) {
      challenges.delete(id);
    }
  }
}

/**
 * GET /api/auth/challenge
 * Returns a fresh challenge for WebAuthn authentication.
 */
export async function GET() {
  sweepExpired();

  if (challenges.size >= MAX_CHALLENGES) {
    return NextResponse.json({ error: 'Server busy' }, { status: 503 });
  }

  const challenge = crypto.randomBytes(CHALLENGE_BYTES);
  const challengeId = crypto.randomUUID();

  challenges.set(challengeId, { challenge, createdAt: Date.now() });

  // Return as base64url for the client to decode into ArrayBuffer
  const challengeB64 = challenge
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return NextResponse.json({ challengeId, challenge: challengeB64 });
}

/** Consume a challenge by ID. Returns the raw Buffer or null if expired/missing. */
export function consumeChallenge(challengeId: string): Buffer | null {
  const entry = challenges.get(challengeId);
  if (!entry) return null;

  challenges.delete(challengeId);

  if (Date.now() - entry.createdAt > CHALLENGE_TTL_MS) {
    return null;
  }

  return entry.challenge;
}
