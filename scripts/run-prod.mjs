/**
 * Скриптийг ПРОД сан дээр ажиллуулна — зориуд, тусдаа команд.
 *
 *   node --env-file=.env.local scripts/run-prod.mjs scripts/create-school.ts ...
 *
 * `.env.local`-ийн `DATABASE_URL` нь хөгжүүлэлтийн сан руу заадаг. Энэ
 * бүрхүүл л түүнийг `PROD_DATABASE_URL`-аар солино. Ингэснээр прод-ыг
 * андуурч хөндөх зам ганцхан, нэрээрээ ил байна.
 */
import { spawnSync } from "node:child_process";

const prod = process.env.PROD_DATABASE_URL;
if (!prod) {
  console.error("PROD_DATABASE_URL тохируулагдаагүй (.env.local).");
  process.exit(1);
}

const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error("Ажиллуулах скрипт заагаагүй.");
  process.exit(1);
}

console.log("⚠️  ПРОД сан дээр ажиллаж байна:", script);
const r = spawnSync("npx", ["tsx", "--conditions=react-server", script, ...args.map((a) => JSON.stringify(a))], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: prod },
});
process.exit(r.status ?? 1);
