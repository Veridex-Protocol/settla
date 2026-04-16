import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "../../node_modules/@types/pg";

declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
    var __pgPool: Pool | undefined;
}

// Create or reuse PostgreSQL pool for Prisma 7.x adapter pattern
// Optimized for Neon serverless with connection pooling
function getPool(): Pool {
    if (globalThis.__pgPool) {
        return globalThis.__pgPool;
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
        connectionTimeoutMillis: 10000, // Fail fast if connection takes > 10s
    });

    if (process.env.NODE_ENV !== "production") {
        globalThis.__pgPool = pool;
    }

    return pool;
}

// Create Prisma client with pg adapter
function createPrismaClient(): PrismaClient {
    const pool = getPool();
    const adapter = new PrismaPg(pool);
    
    const client = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    
    return client;
}

// Singleton pattern for PrismaClient - use __ prefix to avoid conflicts
const prismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalThis.__prisma = prismaClient;
}

// Export the singleton
export const db = prismaClient;
export const prisma = prismaClient;

