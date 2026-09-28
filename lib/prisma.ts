import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: databaseUrl,

    // Supabase's staging connection is currently presenting a certificate chain
    // that Node's pg driver does not trust in Vercel Preview. Keep this exception
    // strictly limited to Preview so Production TLS verification is unchanged.
    ...(process.env.VERCEL_ENV === "preview"
      ? { ssl: { rejectUnauthorized: false } }
      : {}),

    // Important for Vercel/serverless:
    // keep each function instance from opening many DB connections.
    max: 1,

    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,

    allowExitOnIdle: true,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

globalForPrisma.pgPool = pool;
globalForPrisma.prisma = prisma;
