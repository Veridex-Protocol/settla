import { NextResponse } from 'next/server';
import { issueChallenge } from '@/lib/webauthn-challenges';

/**
 * GET /api/auth/challenge
 * Returns a fresh WebAuthn challenge for Sera dashboard login.
 *
 * The challenge store and `consumeChallenge` helper live in
 * `@/lib/webauthn-challenges` — Next.js 16 forbids non-handler exports from
 * route files (only GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD plus a few config
 * keys are allowed).
 */
export async function GET() {
  const issued = issueChallenge();
  if (!issued) {
    return NextResponse.json({ error: 'Server busy' }, { status: 503 });
  }
  return NextResponse.json({
    challengeId: issued.challengeId,
    challenge: issued.challengeB64,
  });
}

