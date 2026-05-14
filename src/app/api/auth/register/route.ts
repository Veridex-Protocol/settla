import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { issueRegistrationToken } from '@/lib/auth/registration-tokens';
import { applyReferralCode } from '@/lib/services/referral-service';
import {
    awardSecurityFirstBadge,
    awardEarlyAdopterBadgeIfEligible,
    awardPasskeyPoints,
} from '@/lib/services/achievement-service';

/**
 * POST /api/auth/register
 *
 * Records a freshly-created passkey credential and provisions a Business +
 * User pair if one doesn't already exist for the wallet address. Returns a
 * single-use registration token that the client can hand to NextAuth's
 * credentials provider to obtain a session without a second WebAuthn
 * ceremony.
 *
 * Trust model: the credential was just created on the user's device via the
 * Veridex SDK's WebAuthn ceremony, which the OS already verified. The
 * dashboard records the public key here (re-encoded as a COSE_Key) so future
 * sign-ins can be verified by @simplewebauthn/server against our own
 * challenge.
 */

const HEX_RE = /^(0x)?[0-9a-fA-F]+$/;
const DEC_RE = /^[0-9]+$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

interface RegisterBody {
    credentialId?: string;
    publicKeyX?: string;
    publicKeyY?: string;
    keyHash?: string;
    walletAddress?: string;
    username?: string;
    referralCode?: string;
    transports?: string;
}

/**
 * Normalize a P-256 coordinate to a 32-byte Buffer. The client serializes the
 * coordinates as `BigInt.toString()`, which is base-10, but some callers may
 * pass hex (with or without an `0x` prefix). Accept both.
 */
function coordinateToBuffer(value: string): Buffer {
    if (DEC_RE.test(value)) {
        const hex = BigInt(value).toString(16).padStart(64, '0');
        if (hex.length > 64) {
            throw new Error('Coordinate exceeds 32 bytes');
        }
        return Buffer.from(hex, 'hex');
    }
    const stripped = (value.startsWith('0x') ? value.slice(2) : value).padStart(64, '0');
    if (stripped.length !== 64) {
        throw new Error('Coordinate must encode 32 bytes');
    }
    return Buffer.from(stripped, 'hex');
}

/**
 * Build a COSE_Key (ES256 / P-256) from the X and Y coordinates, encoded as
 * a base64 string. This matches the format @simplewebauthn/server expects in
 * `credential.publicKey` for `verifyAuthenticationResponse`.
 *
 * COSE map (5 entries):
 *   1  (kty) = 2  (EC2)
 *   3  (alg) = -7 (ES256)
 *  -1  (crv) = 1  (P-256)
 *  -2  (x)   = 32 bytes
 *  -3  (y)   = 32 bytes
 */
function encodeCoseEC2Key(xRaw: string, yRaw: string): string {
    const x = coordinateToBuffer(xRaw);
    const y = coordinateToBuffer(yRaw);
    if (x.length !== 32 || y.length !== 32) {
        throw new Error('Public key coordinates must be 32 bytes each');
    }

    // CBOR-encode a fixed-shape map(5).
    const parts: Buffer[] = [
        Buffer.from([0xa5]), // map(5)
        Buffer.from([0x01]), // key: 1 (kty)
        Buffer.from([0x02]), // value: 2 (EC2)
        Buffer.from([0x03]), // key: 3 (alg)
        Buffer.from([0x26]), // value: -7 (ES256)
        Buffer.from([0x20]), // key: -1 (crv)
        Buffer.from([0x01]), // value: 1 (P-256)
        Buffer.from([0x21]), // key: -2 (x)
        Buffer.from([0x58, 0x20]), // bytes(32)
        x,
        Buffer.from([0x22]), // key: -3 (y)
        Buffer.from([0x58, 0x20]), // bytes(32)
        y,
    ];

    return Buffer.concat(parts).toString('base64');
}

export async function POST(request: Request) {
    let body: RegisterBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        credentialId,
        publicKeyX,
        publicKeyY,
        keyHash,
        walletAddress,
        username,
        referralCode,
        transports,
    } = body;

    // Validate required fields
    if (!credentialId || typeof credentialId !== 'string' || credentialId.length > 1024) {
        return NextResponse.json({ error: 'Invalid credentialId' }, { status: 400 });
    }
    if (!walletAddress || !ADDRESS_RE.test(walletAddress)) {
        return NextResponse.json({ error: 'Invalid walletAddress' }, { status: 400 });
    }
    if (!username || typeof username !== 'string' || username.length > 200) {
        return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    if (!publicKeyX || typeof publicKeyX !== 'string' || publicKeyX.length > 200 || !(HEX_RE.test(publicKeyX) || DEC_RE.test(publicKeyX))) {
        return NextResponse.json({ error: 'Invalid publicKeyX' }, { status: 400 });
    }
    if (!publicKeyY || typeof publicKeyY !== 'string' || publicKeyY.length > 200 || !(HEX_RE.test(publicKeyY) || DEC_RE.test(publicKeyY))) {
        return NextResponse.json({ error: 'Invalid publicKeyY' }, { status: 400 });
    }
    if (keyHash !== undefined && (typeof keyHash !== 'string' || keyHash.length > 200 || !HEX_RE.test(keyHash))) {
        return NextResponse.json({ error: 'Invalid keyHash' }, { status: 400 });
    }

    const normalizedWallet = walletAddress.toLowerCase();

    let coseKey: string;
    try {
        coseKey = encodeCoseEC2Key(publicKeyX, publicKeyY);
    } catch (err) {
        console.error('[register] COSE encoding failed:', err);
        return NextResponse.json({ error: 'Invalid public key' }, { status: 400 });
    }

    try {
        // If a credential row already exists for this credentialId, this is a
        // re-registration / repeat call. Just issue a token for the existing
        // user instead of failing.
        const existing = await db.authenticator.findUnique({
            where: { credentialID: credentialId },
            include: { user: { include: { business: true } } },
        });

        if (existing) {
            const token = issueRegistrationToken({
                userId: existing.userId,
                walletAddress: existing.user.business?.walletAddress ?? normalizedWallet,
                credentialId,
            });
            if (!token) {
                return NextResponse.json({ error: 'Server busy' }, { status: 503 });
            }
            return NextResponse.json({
                registrationToken: token,
                userId: existing.userId,
                walletAddress: existing.user.business?.walletAddress ?? normalizedWallet,
                reused: true,
            });
        }

        // Find an existing user / business. Match on wallet address first
        // (same passkey re-registering), and on email second (same person
        // re-registering with a fresh passkey → fresh wallet address). If we
        // find one by email, attach the new credential to that Business but
        // leave its original walletAddress untouched.
        const emailFromUsername = username.includes('@')
            ? username.toLowerCase()
            : null;

        let user = await db.user.findFirst({
            where: { business: { walletAddress: normalizedWallet } },
            include: { business: true },
        });

        if (!user && emailFromUsername) {
            const business = await db.business.findUnique({
                where: { email: emailFromUsername },
                include: { users: { take: 1 } },
            });
            if (business) {
                if (business.users.length > 0) {
                    user = await db.user.findUnique({
                        where: { id: business.users[0].id },
                        include: { business: true },
                    });
                } else {
                    user = await db.user.create({
                        data: {
                            name: emailFromUsername.split('@')[0],
                            email: emailFromUsername,
                            businessId: business.id,
                        },
                        include: { business: true },
                    });
                }
            }
        }

        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            const business = await db.business.create({
                data: {
                    name: emailFromUsername
                        ? `Business ${normalizedWallet.slice(0, 8)}`
                        : username,
                    email: emailFromUsername
                        ?? `${normalizedWallet.slice(0, 10)}@sera.pay`,
                    walletAddress: normalizedWallet,
                    kybStatus: 'pending',
                },
            });
            user = await db.user.create({
                data: {
                    name: emailFromUsername ? emailFromUsername.split('@')[0] : username,
                    email: emailFromUsername,
                    businessId: business.id,
                },
                include: { business: true },
            });
        }

        // Create the Authenticator row.
        await db.authenticator.create({
            data: {
                credentialID: credentialId,
                userId: user.id,
                providerAccountId: normalizedWallet,
                credentialPublicKey: coseKey,
                counter: 0,
                credentialDeviceType: 'singleDevice',
                credentialBackedUp: false,
                transports: transports ?? null,
                publicKeyX,
                publicKeyY,
                keyHash: keyHash ?? null,
            },
        });

        // Apply referral code on initial registration only
        if (isNewUser && referralCode && typeof referralCode === 'string') {
            try {
                await applyReferralCode(user.id, referralCode);
            } catch (err) {
                console.error('[register] referral application failed:', err);
            }
        }

        // Gamification: passkey-related badges + points (idempotent)
        try {
            await Promise.all([
                awardSecurityFirstBadge(user.id),
                awardPasskeyPoints(user.id),
                awardEarlyAdopterBadgeIfEligible(user.id),
            ]);
        } catch (gamErr) {
            console.error('[register] gamification failed:', gamErr);
        }

        const token = issueRegistrationToken({
            userId: user.id,
            walletAddress: normalizedWallet,
            credentialId,
        });
        if (!token) {
            return NextResponse.json({ error: 'Server busy' }, { status: 503 });
        }

        return NextResponse.json({
            registrationToken: token,
            userId: user.id,
            walletAddress: normalizedWallet,
        });
    } catch (err) {
        console.error('[register] failed:', err);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
