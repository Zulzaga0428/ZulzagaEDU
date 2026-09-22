/**
 * Прод санд migration ажиллуулна — ЗОРИУД, тусдаа команд.
 *
 *   npm run db:migrate:prod
 *
 * Энгийн `npm run db:migrate` одоо хөгжүүлэлтийн сан (zulzaga_dev) руу явна.
 * Прод-ыг андуурч хөндөхгүйн тулд энэ хоёр тусдаа.
 */
import { spawnSync } from "node:child_process";

const prod = process.env.PROD_DATABASE_URL;
if (!prod) {
  console.error("PROD_DATABASE_URL тохируулагдаагүй (.env.local).");
  process.exit(1);
}

console.log("⚠️  ПРОД санд migration ажиллуулж байна.");
const r = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: prod },
});
process.exit(r.status ?? 1);
