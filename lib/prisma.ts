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

const isPreview = process.env.VERCEL_ENV === "preview";
if (isPreview) {
  try {
    console.log("PRISMA_PREVIEW_DB_HOST", new URL(databaseUrl).hostname);
  } catch {
    console.log("PRISMA_PREVIEW_DB_HOST", "invalid-url");
  }
}
const connectionString = (() => {
  if (!isPreview) return databaseUrl;

  // The staging DATABASE_URL currently carries an sslmode query parameter.
  // node-postgres parses that parameter after the explicit ssl option and can
  // force certificate verification again. Strip it in Preview, then provide
  // the TLS behavior explicitly below. Production remains untouched.
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");
  return url.toString();
})();

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString,

    ...(isPreview
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
