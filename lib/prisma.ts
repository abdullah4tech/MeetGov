/**
 * Prisma client singleton for Next.js API routes.
 * Prisma v7 requires an adapter — using @prisma/adapter-neon.
 * Prevents "too many connections" in dev due to hot-reloading.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createClient() {
  // PrismaNeon accepts a connection string directly (no Pool needed)
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
