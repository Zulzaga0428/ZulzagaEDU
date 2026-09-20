import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL тохируулагдаагүй байна.");
}

/**
 * Хөгжүүлэлтийн үед Next нь модулиудыг дахин ачаалдаг тул pool-ийг
 * globalThis дээр хадгална — эс бөгөөс холболт алгуур цуглаад Postgres-ийн
 * хязгаарт хүрнэ.
 */
const globalForDb = globalThis as unknown as { __zeduPool?: Pool };

const pool =
  globalForDb.__zeduPool ??
  new Pool({
    connectionString,
    max: 10,
    // Railway-гийн нийтийн TCP proxy-оор явахад TLS шаардана.
    ssl: connectionString.includes("proxy.rlwy.net") ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__zeduPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
