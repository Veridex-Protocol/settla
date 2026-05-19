import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { applyReferralCode } from "@/lib/services/referral-service";
import { consumeChallenge } from "@/lib/webauthn-challenges";
import { consumeRegistrationToken } from "@/lib/auth/registration-tokens";

// Extend the session user type
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            walletAddress?: string | null;
        };
    }
    
    interface User {
        walletAddress?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        walletAddress?: string | null;
    }
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(db),
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours (in seconds)
    },
    jwt: {
        maxAge: 24 * 60 * 60, // 24 hours (in seconds)
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" 
                ? "__Secure-next-auth.session-token" 
                : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "strict",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Passkey",
            credentials: {
                credentialId: { label: "Credential ID", type: "text" },
                userHandle: { label: "User Handle (wallet address)", type: "text" },
                referralCode: { label: "Referral Code", type: "text" },
                challengeId: { label: "Challenge ID", type: "text" },
                authResponse: { label: "WebAuthn Auth Response (JSON)", type: "text" },
                registrationToken: { label: "One-time registration token", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.userHandle) {
                    return null;
                }

                const walletAddress = credentials.userHandle.toLowerCase();
                const referralCode = credentials.referralCode || null;

                // ─── Path A: one-time registration token ────────────────────
                // The user just completed /api/auth/register, which already
                // recorded the credential. We trust the token (single-use,
                // 60s TTL, server-issued) instead of running a second
                // WebAuthn ceremony on top of the registration ceremony.
                if (credentials.registrationToken) {
                    const ticket = consumeRegistrationToken(credentials.registrationToken);
                    if (!ticket) {
                        console.error("[Auth] Invalid or expired registration token");
                        return null;
                    }
                    if (ticket.walletAddress.toLowerCase() !== walletAddress) {
                        console.error("[Auth] Registration token wallet mismatch");
                        return null;
                    }
                    // Skip WebAuthn verification — fall through to the user
                    // lookup / referral block below.
                } else {
                    // ─── Path B: full WebAuthn assertion ────────────────────
                    if (!credentials.challengeId || !credentials.authResponse) {
                        return null;
                    }

                    // VDX-AUTH-004: Consume server-generated challenge (single-use + TTL)
                    const expectedChallenge = consumeChallenge(credentials.challengeId);
                    if (!expectedChallenge) {
                        console.error('[Auth] Invalid or expired challenge:', credentials.challengeId);
                        return null;
                    }

                    // VDX-AUTH-004: Verify WebAuthn authentication response
                    let authResponse;
                    try {
                        authResponse = JSON.parse(credentials.authResponse);
                    } catch {
                        console.error('[Auth] Invalid authResponse JSON');
                        return null;
                    }

                    // Look up the stored authenticator by credential ID
                    const authenticator = await db.authenticator.findUnique({
                        where: { credentialID: authResponse.id },
                    });

                    if (!authenticator) {
                        console.error('[Auth] Unknown credential ID:', authResponse.id);
                        return null;
                    }

                    if (!authenticator.credentialPublicKey) {
                        console.error('[Auth] Authenticator missing public key — cannot verify');
                        return null;
                    }

                    try {
                        // Derive RP defaults from NEXTAUTH_URL so localhost dev
                        // works without extra env. The client sends
                        // `rpId: window.location.hostname`, so server defaults
                        // must match.
                        const authUrl =
                            process.env.NEXTAUTH_URL ||
                            process.env.NEXT_PUBLIC_APP_URL ||
                            'https://veridex.network';
                        let derivedRpID = 'veridex.network';
                        let derivedOrigin = 'https://veridex.network';
                        try {
                            const u = new URL(authUrl);
                            derivedRpID = u.hostname;
                            derivedOrigin = u.origin;
                        } catch {
                            /* fall through to defaults */
                        }
                        const rpID = process.env.WEBAUTHN_RP_ID || derivedRpID;
                        // Allow comma-separated list for multi-origin deploys.
                        const rawOrigin = process.env.WEBAUTHN_RP_ORIGIN;
                        const rpOrigin: string | string[] = rawOrigin
                            ? rawOrigin.includes(',')
                                ? rawOrigin.split(',').map((s) => s.trim()).filter(Boolean)
                                : rawOrigin
                            : derivedOrigin;

                        const verification = await verifyAuthenticationResponse({
                            response: authResponse,
                            expectedChallenge: expectedChallenge
                                .toString('base64')
                                .replace(/\+/g, '-')
                                .replace(/\//g, '_')
                                .replace(/=+$/, ''),
                            expectedOrigin: rpOrigin,
                            expectedRPID: rpID,
                            credential: {
                                id: authenticator.credentialID,
                                publicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
                                counter: authenticator.counter,
                            },
                        });

                        if (!verification.verified) {
                            console.error('[Auth] WebAuthn verification failed for wallet:', walletAddress);
                            return null;
                        }

                        // Update authenticator counter to prevent replay
                        await db.authenticator.update({
                            where: { credentialID: authResponse.id },
                            data: { counter: verification.authenticationInfo.newCounter },
                        });
                    } catch (err) {
                        console.error('[Auth] WebAuthn verification error:', err);
                        return null;
                    }
                }

                console.log('[Auth] Passkey auth succeeded for wallet:', walletAddress);

                // First try to find existing user by their business wallet address
                let user = await db.user.findFirst({
                    where: {
                        business: {
                            walletAddress: walletAddress
                        }
                    },
                    include: {
                        business: true
                    }
                });

                // If no user found, try to find by id (for backward compatibility)
                if (!user) {
                    user = await db.user.findUnique({
                        where: { id: credentials.userHandle },
                        include: { business: true }
                    });
                }

                // Track if this is a new user (for referral application)
                const isNewUser = !user;
                console.log('[Auth] Is new user:', isNewUser);

                // If still no user, create a new one with a pending business
                if (!user) {
                    // Create business with wallet address first
                    const business = await db.business.create({
                        data: {
                            name: `Business ${walletAddress.slice(0, 8)}`,
                            email: `${walletAddress.slice(0, 10)}@sera.pay`, // Placeholder
                            walletAddress: walletAddress,
                            kybStatus: 'pending',
                        }
                    });

                    // Then create user linked to the business
                    user = await db.user.create({
                        data: {
                            name: walletAddress.slice(0, 10),
                            businessId: business.id,
                        },
                        include: {
                            business: true
                        }
                    });

                    console.log('[Auth] Created new user:', user.id);

                    // Apply referral code if provided and this is a new user
                    if (referralCode) {
                        try {
                            const referrerId = await applyReferralCode(user.id, referralCode);
                            if (referrerId) {
                                console.log(`[Auth] Applied referral code ${referralCode} for new user ${user.id}, referrer: ${referrerId}`);
                            } else {
                                console.log(`[Auth] Referral code ${referralCode} not found or invalid`);
                            }
                        } catch (err) {
                            console.error('[Auth] Failed to apply referral code:', err);
                            // Don't fail auth if referral fails
                        }
                    }
                } else if (referralCode && !user.referredBy) {
                    // User exists but wasn't referred - try to apply referral code now
                    console.log('[Auth] Existing user without referrer, attempting to apply referral code');
                    try {
                        const referrerId = await applyReferralCode(user.id, referralCode);
                        if (referrerId) {
                            console.log(`[Auth] Applied late referral code ${referralCode} for existing user ${user.id}`);
                        }
                    } catch (err) {
                        console.error('[Auth] Failed to apply late referral code:', err);
                    }
                }

                // Return user object with wallet address
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    walletAddress: user.business?.walletAddress ?? walletAddress,
                };
            }
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.walletAddress = user.walletAddress;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.sub!;
                session.user.walletAddress = token.walletAddress;
            }
            return session;
        }
    }
};
