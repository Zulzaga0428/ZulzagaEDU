import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// .env.local нь локал хөгжүүлэлтийн холболтыг агуулна (git-д ордоггүй).
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
