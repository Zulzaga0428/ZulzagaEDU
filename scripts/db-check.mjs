/**
 * Өгөгдлийн сангийн төлвийг шалгана — хүснэгт, enum, индексийн тоо.
 *
 *   node scripts/db-check.mjs
 *
 * Migration бодитоор буусан эсэхийг батлахад ашиглана. «Амжилттай» гэсэн
 * мессежэд бус, сангаас уншсан тоонд итгэнэ.
 */
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL алга. .env.local байгаа эсэхийг шалгана уу.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("proxy.rlwy.net") ? { rejectUnauthorized: false } : undefined,
});

try {
  const tables = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`,
  );
  const enums = await pool.query(`select typname from pg_type where typtype = 'e' order by typname`);
  const indexes = await pool.query(
    `select count(*)::int as c from pg_indexes where schemaname = 'public'`,
  );

  console.log(`Хүснэгт (${tables.rowCount}):`);
  for (const r of tables.rows) console.log("  ", r.table_name);
  console.log(`\nEnum (${enums.rowCount}): ${enums.rows.map((r) => r.typname).join(", ")}`);
  console.log(`Индекс: ${indexes.rows[0].c}`);
} finally {
  await pool.end();
}
