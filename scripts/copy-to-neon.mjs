/**
 * Прод өгөгдлийг Railway Postgres → Neon (Сингапур) руу хуулна.
 *
 *   node scripts/copy-to-neon.mjs            — Neon хоосон байх ёстой
 *   node scripts/copy-to-neon.mjs --replace  — Neon-ы хуучин хуулбарыг арилгаад дахин хуулна
 *
 * Эх: `.env.local`-ийн PROD_DATABASE_URL. Зорилт: Railway апп сервисийн
 * NEON_DATABASE_URL — энд л уншина, хэзээ ч хэвлэхгүй.
 *
 * Хүснэгтийн бүтцийг drizzle migration үүсгэнэ (энэ скрипт биш) — тиймээс
 * хоёр сан яг ижил бүтэцтэй. Энэ нь зөвхөн МӨРИЙГ хуулна: гадаад түлхүүрийн
 * дарааллаар (эцэг хүснэгт эхэнд), дараа нь хүснэгт бүрийн мөрийн тоог хоёр
 * талд тулгана. «Амжилттай» гэсэн мессежэд бус, тоонд итгэнэ.
 *
 * ⚠️ Эх санд ЗӨВХӨН уншина. Хуучин Railway санг хэзээ ч өөрчлөхгүй — буцаах зам.
 */
import { execSync } from "node:child_process";
import { config } from "dotenv";
import pg from "pg";

const { Pool } = pg;

config({ path: ".env.local" });

/*
  ⚠️ pg нь цагийг JS Date болгодог — микросекунд (…44.357532 → …44.357)
  алдагдана. Хуулахдаа бичвэрээр нь дамжуулна: 1114 timestamp,
  1184 timestamptz, 1082 date. Ингэхгүй бол тоо таарсан ч агуулга зөрнө.
*/
for (const oid of [1114, 1184, 1082]) pg.types.setTypeParser(oid, (v) => v);

const APP_SERVICE = "f5225020-935c-4254-b4e7-501f29e5b9cf";
const ENVIRONMENT = "5ec3ae45-d7e1-4c40-802b-7735547fefa3";
const BATCH = 500;
const replace = process.argv.includes("--replace");

const sourceUrl = process.env.PROD_DATABASE_URL;
if (!sourceUrl) throw new Error("PROD_DATABASE_URL алга (.env.local).");

const vars = JSON.parse(
  execSync(`railway variables --service ${APP_SERVICE} --environment ${ENVIRONMENT} --json`, {
    encoding: "utf8",
  }),
);
const targetUrl = vars.NEON_DATABASE_URL;
if (!targetUrl) throw new Error("Railway дээр NEON_DATABASE_URL алга.");
if (new URL(targetUrl).hostname === new URL(sourceUrl).hostname) {
  throw new Error("Эх ба зорилт ижил сан байна — зогслоо.");
}

const src = new Pool({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
const dst = new Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: true } });

async function tables(pool) {
  const r = await pool.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`,
  );
  return r.rows.map((x) => x.table_name);
}

/** Эцэг хүснэгт эхэнд. Өөрийгөө заасан түлхүүрийг тоохгүй. */
async function fkOrder(pool, names) {
  const r = await pool.query(
    `select tc.table_name as child, ccu.table_name as parent
     from information_schema.table_constraints tc
     join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
     where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`,
  );
  const deps = new Map(names.map((n) => [n, new Set()]));
  for (const { child, parent } of r.rows) if (child !== parent) deps.get(child)?.add(parent);
  const out = [];
  const seen = new Set();
  const visit = (n, path = new Set()) => {
    if (seen.has(n)) return;
    if (path.has(n)) throw new Error(`Гадаад түлхүүрийн тойрог: ${[...path, n].join(" → ")}`);
    path.add(n);
    for (const p of deps.get(n) ?? []) visit(p, path);
    path.delete(n);
    seen.add(n);
    out.push(n);
  };
  names.forEach((n) => visit(n));
  return out;
}

/**
 * Өөрийгөө заасан хүснэгтэд (жишээ нь хариу → эх мессеж) эцэг мөр эхэнд
 * орох ёстой. Ийм багана байвал тэр баганаар null-уудыг эхэнд эрэмбэлнэ —
 * гүн мод гарвал энд ил алдаа өгнө.
 */
async function selfRefColumn(pool, table) {
  const r = await pool.query(
    `select kcu.column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
     join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
     where tc.constraint_type = 'FOREIGN KEY' and tc.table_name = $1 and ccu.table_name = $1`,
    [table],
  );
  return r.rows[0]?.column_name ?? null;
}

const count = async (pool, t) => (await pool.query(`select count(*)::int c from "${t}"`)).rows[0].c;

try {
  const srcTables = await tables(src);
  const dstTables = await tables(dst);
  const missing = srcTables.filter((t) => !dstTables.includes(t));
  if (missing.length) {
    throw new Error(`Neon дээр хүснэгт дутуу (migration ажиллуулаагүй?): ${missing.join(", ")}`);
  }

  const order = await fkOrder(src, srcTables);

  const existing = (await Promise.all(order.map((t) => count(dst, t)))).reduce((a, b) => a + b, 0);
  if (existing > 0 && !replace) {
    throw new Error(`Neon хоосон биш (${existing} мөр). Дахин хуулах бол --replace.`);
  }
  if (existing > 0) {
    console.log(`Neon-ы хуучин хуулбарыг (${existing} мөр) арилгаж байна…`);
    await dst.query(`truncate ${order.map((t) => `"${t}"`).join(", ")} cascade`);
  }

  console.log(`\n${order.length} хүснэгт хуулж байна:\n`);
  for (const t of order) {
    const self = await selfRefColumn(src, t);
    const orderBy = self ? `order by ("${self}" is not null)` : "";
    const rows = (await src.query(`select * from "${t}" ${orderBy}`)).rows;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      await dst.query(
        `insert into "${t}" select * from json_populate_recordset(null::"${t}", $1::json)`,
        [JSON.stringify(chunk)],
      );
    }
    process.stdout.write(`  ${t}: ${rows.length}\n`);
  }

  // serial дараалал — uuid-ууд хамаагүй, гэхдээ байвал хоцорч давхардал үүсгэнэ.
  const seqs = await dst.query(
    `select table_name, column_name, pg_get_serial_sequence(format('%I', table_name), column_name) seq
     from information_schema.columns where table_schema = 'public'
       and pg_get_serial_sequence(format('%I', table_name), column_name) is not null`,
  );
  for (const s of seqs.rows) {
    await dst.query(
      `select setval($1, coalesce((select max("${s.column_name}") from "${s.table_name}"), 0) + 1, false)`,
      [s.seq],
    );
  }

  console.log("\nТулгалт (Railway / Neon):\n");
  let bad = 0;
  for (const t of order) {
    const [a, b] = await Promise.all([count(src, t), count(dst, t)]);
    const ok = a === b;
    if (!ok) bad++;
    console.log(`  ${ok ? "✓" : "✗"} ${t.padEnd(28)} ${a} / ${b}`);
  }
  /*
    Тоо таарах нь хангалтгүй — утга нь ч ижил байх ёстой (микросекундын
    алдагдлыг ЭНЭ шалгалт л барьсан). Хоёр талыг UTC болгоод хүснэгт бүрийн
    бүх мөрийн md5-ыг тулгана.
  */
  const [ca, cb] = [await src.connect(), await dst.connect()];
  try {
    for (const c of [ca, cb]) await c.query("set timezone = 'UTC'");
    const md5 = async (c, t) =>
      (await c.query(
        `select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) m from "${t}" x`,
      )).rows[0].m;
    for (const t of order) {
      if ((await md5(ca, t)) !== (await md5(cb, t))) {
        bad++;
        console.log(`  ✗ ${t}: агуулга зөрж байна`);
      }
    }
  } finally {
    ca.release();
    cb.release();
  }

  console.log(
    bad === 0 ? "\n✅ Бүх хүснэгт тоо, агуулгаараа таарч байна." : `\n❌ ${bad} зөрүү байна.`,
  );
  process.exitCode = bad === 0 ? 0 : 1;
} finally {
  await src.end();
  await dst.end();
}
