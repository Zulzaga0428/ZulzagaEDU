/**
 * Демо сургуулийг аппын өөрийнх нь дэлгэцээр бэлтгэнэ.
 *
 *   node scripts/demo-school.mjs <хаяг> <эрхлэгчийн дугаар> <эрхлэгчийн PIN>
 *
 * Яагаад SQL-ээр биш, дэлгэцээр вэ: пилот сургууль яг ийм замаар онооно —
 * эрхлэгч багш нэмнэ, анги үүсгэнэ, багш сурагчдаа нэмнэ. Тиймээс энэ скрипт
 * нь зөвхөн демо бэлтгэдэг зүйл биш, **онооруулах урсгалын тест** ч юм. SQL
 * ээр шууд бичвэл тэр урсгал туршигдахгүй үлдэнэ.
 *
 * Юу ч УСТГАХГҮЙ. Зөвхөн нэмнэ. Сургууль нь `scripts/create-school.ts`-ээр
 * урьдчилан үүссэн байх ёстой.
 *
 * Төгсгөлд бүх нэвтрэх мэдээллийг хэвлэнэ — ажилчдын гарт өгөх хуудас.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const [BASE, MANAGER_PHONE, MANAGER_PIN] = process.argv.slice(2);
if (!BASE || !MANAGER_PHONE || !MANAGER_PIN) {
  console.error("Хэрэглээ: node scripts/demo-school.mjs <хаяг> <дугаар> <PIN>");
  process.exit(1);
}

const SHOTS = "demo-shots";
const PATIENCE = BASE.includes("127.0.0.1") || BASE.includes("localhost") ? 180000 : 60000;

/** Демогийн бүрэлдэхүүн. Бодит ангийн хэмжээ — хоосон ч биш, тоглоом ч биш. */
const TEACHER = { name: "Дэмогийн Багш", phone: "99009900" };
const KLASS = { name: "3А", grade: "3" };
const STUDENTS = [
  "Болдын Ануужин",
  "Ганбатын Тэмүүжин",
  "Дорждеренгийн Хонгорзул",
  "Мөнхбатын Батбаяр",
  "Сайханбилэгийн Номин",
  "Түмэнбаярын Энхжин",
];
const HOMEWORK = [
  { title: "Монгол хэл — 24-р дасгал", days: 1 },
  { title: "Математик — 3-р бодлого", days: 2 },
];

const issued = { teacher: null, students: [] };
const problems = [];

function ok(label, detail = "") {
  console.log(`  ✅ ${label}${detail ? " — " + detail : ""}`);
}
function bad(label, detail = "") {
  problems.push(`${label}${detail ? " — " + detail : ""}`);
  console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "mn-MN" });
const page = await ctx.newPage();
page.on("pageerror", (e) => bad("хуудасны JS алдаа", String(e).slice(0, 120)));
mkdirSync(SHOTS, { recursive: true });

async function signIn(identifier, pin, label) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: PATIENCE });
  await page.fill('input[name="identifier"]', identifier);
  await page.fill('input[name="pin"]', pin);
  await Promise.all([
    page.waitForURL(/\/(bagsh|etseg-eh|erhlegch|suragch)/, { timeout: PATIENCE }),
    // ⚠️ Бичвэрээр. Нэвтэрсний дараа `button[type=submit]`-ын эхнийх нь
    // толгойн «Гарах» товч болдог тул сонголт түүн дээр унадаг.
    page.click('button:has-text("Нэвтрэх")'),
  ]);
  ok(`${label} нэвтрэв`, page.url().replace(BASE, ""));
}

async function signOut() {
  await page.click('button[aria-label="Гарах"]');
  await page.waitForURL(/\/login/, { timeout: PATIENCE });
}

/** Нэвтрэх мэдээллийн модалаас PIN, кодыг уншаад хаана. */
async function readCard() {
  const card = page.locator('[aria-label*="нэвтрэх мэдээлэл"]');
  await card.waitFor({ state: "visible", timeout: PATIENCE });
  const text = await card.innerText();
  const pin = text.match(/\b(\d{4})\b/)?.[1] ?? null;
  const code = text.match(/\b([0-9]+[А-ЯA-Z]?-[A-Z]{4,8})\b/)?.[1] ?? null;
  await page.click('button:has-text("Бичиж авлаа")');
  await card.waitFor({ state: "hidden", timeout: PATIENCE }).catch(() => {});
  return { pin, code, text };
}

try {
  console.log("\n1. Эрхлэгчээр нэвтрэх");
  await signIn(MANAGER_PHONE, MANAGER_PIN, "эрхлэгч");

  console.log("\n2. Багш нэмэх");
  await page.goto(`${BASE}/erhlegch/bagsh`, { waitUntil: "domcontentloaded", timeout: PATIENCE });
  await page.waitForTimeout(2500);
  const already = await page.locator(`text=${TEACHER.name}`).count();
  if (already > 0) {
    ok("багш аль хэдийн байна", `${TEACHER.name} · ${TEACHER.phone}`);
    issued.teacher = { ...TEACHER, pin: "(өмнө олгосон — PIN дахин харагдахгүй)" };
  } else {
    await page.fill('input[placeholder="Багшийн нэр"]', TEACHER.name);
    await page.fill('input[placeholder="99112233"]', TEACHER.phone);
    await page.click('button:has-text("Багш нэмэх")');
    const card = await readCard();
    issued.teacher = { ...TEACHER, pin: card.pin };
    card.pin ? ok("багш нэмэгдэв", `PIN ${card.pin}`) : bad("багшийн PIN уншигдсангүй");
  }

  console.log("\n3. Анги үүсгэх");
  await page.goto(`${BASE}/erhlegch/bagsh`, { waitUntil: "domcontentloaded", timeout: PATIENCE });
  await page.waitForTimeout(2000);
  if ((await page.locator(`text=${KLASS.name} `).count()) > 0) {
    ok("анги аль хэдийн байна", KLASS.name);
  } else {
    await page.fill('input[placeholder="3А"]', KLASS.name);
    await page.selectOption('select[name="grade"]', KLASS.grade);
    await page.click('button:has-text("Үүсгэх")');
    await page.waitForTimeout(4000);
    ok("анги үүсгэв", `${KLASS.name} · ${KLASS.grade}-р анги`);
  }

  console.log("\n4. Багшийг ангид хуваарилах");
  await page.goto(`${BASE}/erhlegch/bagsh`, { waitUntil: "domcontentloaded", timeout: PATIENCE });
  await page.waitForTimeout(2500);
  const assign = page.locator("form", { has: page.locator('select[name="teacherUserId"]') }).first();
  if ((await assign.count()) > 0) {
    const opts = await assign.locator('select[name="teacherUserId"] option').all();
    let value = null;
    for (const o of opts) {
      if (((await o.textContent()) ?? "").includes(TEACHER.name)) value = await o.getAttribute("value");
    }
    if (value) {
      await assign.locator('select[name="teacherUserId"]').selectOption(value);
      await assign.locator("button").first().click();
      await page.waitForTimeout(4000);
      ok("багш ангид хуваарилагдав");
    } else {
      ok("багш аль хэдийн хуваарилагдсан бололтой", "сонголтод байхгүй");
    }
  } else {
    ok("хуваарилах маягт байхгүй", "багш аль хэдийн ангид байна");
  }
  await page.screenshot({ path: `${SHOTS}/d1-erhlegch.png`, fullPage: true });
  await signOut();

  console.log("\n5. Багшаар нэвтрэх");
  const teacherPin = issued.teacher?.pin;
  if (!teacherPin || !/^\d{4}$/.test(teacherPin)) {
    bad("багшийн PIN байхгүй тул үргэлжлэх боломжгүй", String(teacherPin));
    throw new Error("БАГШИЙН PIN АЛГА");
  }
  await signIn(TEACHER.phone, teacherPin, "багш");

  console.log("\n6. Сурагчид нэмэх");
  await page.goto(`${BASE}/bagsh/urilga`, { waitUntil: "domcontentloaded", timeout: PATIENCE });
  await page.waitForTimeout(2500);
  const input = page.locator('input[placeholder*="сурагч нэмэх"]').first();
  if ((await input.count()) === 0) {
    bad("сурагч нэмэх талбар олдсонгүй", "багшид анги хуваарилагдаагүй байж магадгүй");
  } else {
    for (const name of STUDENTS) {
      if ((await page.locator(`text=${name}`).count()) > 0) {
        ok("аль хэдийн байна", name);
        continue;
      }
      await input.fill(name);
      await page.click('button:has-text("Нэмэх")');
      const card = await readCard();
      issued.students.push({ name, code: card.code, pin: card.pin });
      card.code ? ok(name, `${card.code} · PIN ${card.pin}`) : bad(name, "код уншигдсангүй");
      await page.waitForTimeout(800);
    }
  }
  await page.screenshot({ path: `${SHOTS}/d2-suragchid.png`, fullPage: true });

  console.log("\n7. Даалгавар оруулах");
  for (const hw of HOMEWORK) {
    await page.goto(`${BASE}/bagsh/daalgavar/shine`, { waitUntil: "domcontentloaded", timeout: PATIENCE });
    await page.waitForTimeout(2500);
    if ((await page.locator('input[name="title"]').count()) === 0) {
      bad("даалгаврын маягт байхгүй", "анги хуваарилагдаагүй");
      break;
    }
    await page.fill('input[name="title"]', hw.title);
    await page.fill(
      'input[name="dueDate"]',
      new Date(Date.now() + hw.days * 86400000).toISOString().slice(0, 10),
    );
    const subjects = await page.locator('select[name="subjectId"] option').all();
    if (subjects.length > 1) {
      await page.selectOption('select[name="subjectId"]', await subjects[1].getAttribute("value"));
    }
    await page.click('button:has-text("Илгээх")');
    await page.waitForTimeout(5000);
    ok("даалгавар", hw.title);
  }
  await page.goto(`${BASE}/bagsh`, { waitUntil: "domcontentloaded", timeout: PATIENCE });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/d3-bagsh-nuur.png`, fullPage: true });
} catch (err) {
  bad("ГАЦЛАА", String(err).split("\n")[0].slice(0, 160));
  await page.screenshot({ path: `${SHOTS}/d-error.png`, fullPage: true }).catch(() => {});
}

await browser.close();

/*
  Нэвтрэх мэдээлэл. PIN нь дэлгэцэн дээр НЭГ л удаа харагддаг тул энд бичнэ —
  эс бөгөөс ажилчид нэвтэрч чадахгүй болно. Файл нь `.gitignore`-д.
*/
const lines = [
  "ЗУЛЗАГА EDU — ДЕМО СУРГУУЛИЙН НЭВТРЭХ МЭДЭЭЛЭЛ",
  `Хаяг: ${BASE}`,
  `Бэлтгэсэн: ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
  "",
  `ЭРХЛЭГЧ   ${MANAGER_PHONE} · PIN ${MANAGER_PIN}`,
  issued.teacher ? `БАГШ      ${issued.teacher.phone} · PIN ${issued.teacher.pin}` : "БАГШ      —",
  "",
  "СУРАГЧИД (код + PIN):",
  ...issued.students.map((s) => `  ${s.name.padEnd(28)} ${s.code} · ${s.pin}`),
  "",
  "⚠️ PIN дахин харагдахгүй. Энэ файлыг хадгалаарай.",
];
const out = `${SHOTS}/nevtreh-medeelel.txt`;
writeFileSync(out, lines.join("\n"), "utf8");

console.log("\n" + lines.join("\n"));
console.log(`\nЗураг: ${SHOTS}/ · Мэдээлэл: ${out}`);
console.log(problems.length ? `\n❌ ${problems.length} асуудал` : "\n✅ Демо сургууль бэлэн");
process.exit(problems.length ? 1 : 0);
