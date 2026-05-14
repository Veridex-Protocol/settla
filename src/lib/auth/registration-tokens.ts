import crypto from 'crypto';

/**
 * Short-lived, single-use tokens that prove the holder just completed a
 * passkey registration via /api/auth/register. The dashboard's NextAuth
 * credentials provider accepts one of these in lieu of a full WebAuthn
 * assertion, so the user can be signed in immediately after creating a
 * passkey without a second OS prompt.
 *
 * In-memory store attached to globalThis so the Map survives:
 *   (a) Next.js webpack route-handler bundle isolation in dev — different
 *       routes evaluate distinct module copies, so a plain module-level Map
 *       would be invisible from /api/auth/callback/credentials.
 *   (b) HMR re-evaluation of this module.
 *
 * For multi-instance deployments swap for Redis.
 */

interface TokenEntry {
    userId: string;
    walletAddress: string;
    credentialId: string;
    createdAt: number;
}

const GLOBAL_KEY = Symbol.for('settla.auth.registrationTokens');
type Global = typeof globalThis & { [GLOBAL_KEY]?: Map<string, TokenEntry> };
const g = globalThis as Global;
const tokens: Map<string, TokenEntry> = g[GLOBAL_KEY] ?? new Map<string, TokenEntry>();
g[GLOBAL_KEY] = tokens;

const TOKEN_TTL_MS = 60_000; // 60s — generous for slow clients, still tight
const MAX_TOKENS = 10_000;

function sweep(): void {
    const now = Date.now();
    for (const [t, e] of tokens) {
        if (now - e.createdAt > TOKEN_TTL_MS) tokens.delete(t);
    }
}

export function issueRegistrationToken(entry: Omit<TokenEntry, 'createdAt'>): string | null {
    sweep();
    if (tokens.size >= MAX_TOKENS) return null;
    const token = crypto.randomBytes(32).toString('base64url');
    tokens.set(token, { ...entry, createdAt: Date.now() });
    return token;
}

export function consumeRegistrationToken(token: string): Omit<TokenEntry, 'createdAt'> | null {
    const entry = tokens.get(token);
    if (!entry) return null;
    tokens.delete(token);
    if (Date.now() - entry.createdAt > TOKEN_TTL_MS) return null;
    return {
        userId: entry.userId,
        walletAddress: entry.walletAddress,
        credentialId: entry.credentialId,
    };
}
