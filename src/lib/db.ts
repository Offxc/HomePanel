import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined; // eslint-disable-line no-var
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = db;
