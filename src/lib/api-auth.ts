import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export interface AuthenticatedUser {
    id: string;
    name: string | null;
    email: string | null;
    businessId: string;
    walletAddress: string | null;
}

/**
 * Get the authenticated user from the current request.
 * Supports both NextAuth sessions and wallet-based auth.
 * 
 * @returns The authenticated user with their business ID, or null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return null;
    }

    // Try to find user by their session user id
    const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
            business: true
        }
    });

    if (!user || !user.businessId) {
        // If no businessId, try to look up by wallet address from session
        if (session.user.walletAddress) {
            const business = await db.business.findFirst({
                where: { walletAddress: session.user.walletAddress.toLowerCase() },
                include: { users: true }
            });

            if (business && business.users.length > 0) {
                return {
                    id: business.users[0].id,
                    name: business.users[0].name,
                    email: business.users[0].email,
                    businessId: business.id,
                    walletAddress: business.walletAddress,
                };
            }
        }
        return null;
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        businessId: user.businessId,
        walletAddress: user.business?.walletAddress ?? null,
    };
}
