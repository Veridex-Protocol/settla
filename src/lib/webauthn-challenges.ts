import crypto from 'crypto';

/**
 * VDX-AUTH-004: WebAuthn challenge store for Sera dashboard login.
 *
 * Challenges are stored in-memory with a 5-minute TTL.
 * Multi-instance production should replace with Redis or DB-backed store.
 *
 * Lives in `lib/` (not in a Next.js route file) because Next.js 16 disallows
 * non-handler named exports from `app/.../route.ts`. The Map is attached to
 * `globalThis` via a well-known Symbol so HMR / route-bundle isolation
 * cannot fork it into per-module copies.
 */

interface ChallengeEntry {
  challenge: Buffer;
  createdAt: number;
}

const GLOBAL_KEY = Symbol.for('settla.auth.webauthnChallenges');
type Global = typeof globalThis & { [GLOBAL_KEY]?: Map<string, ChallengeEntry> };
const g = globalThis as Global;
const challenges: Map<string, ChallengeEntry> =
  g[GLOBAL_KEY] ?? new Map<string, ChallengeEntry>();
g[GLOBAL_KEY] = challenges;

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
 * Mint a fresh challenge. Returns `null` if the store is at capacity.
 * The returned `challengeB64` is base64url-encoded for transport to the client.
 */
export function issueChallenge(): { challengeId: string; challengeB64: string } | null {
  sweepExpired();

  if (challenges.size >= MAX_CHALLENGES) {
    return null;
  }

  const challenge = crypto.randomBytes(CHALLENGE_BYTES);
  const challengeId = crypto.randomUUID();

  challenges.set(challengeId, { challenge, createdAt: Date.now() });

  const challengeB64 = challenge
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { challengeId, challengeB64 };
}

/**
 * Consume a challenge by ID. Returns the raw Buffer or null if expired/missing.
 * Challenges are single-use: a successful lookup deletes the entry.
 */
export function consumeChallenge(challengeId: string): Buffer | null {
  const entry = challenges.get(challengeId);
  if (!entry) return null;

  challenges.delete(challengeId);

  if (Date.now() - entry.createdAt > CHALLENGE_TTL_MS) {
    return null;
  }

  return entry.challenge;
}
