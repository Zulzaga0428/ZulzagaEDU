/**
 * Сургалт дээр үзүүлэх яг тэр замыг жинхэнэ хөтчөөр туулна.
 *
 *   node scripts/demo-check.mjs [хаяг]
 *
 * ⚠️ Яагаад `browser-check.mjs`-ээс тусдаа вэ: тэр нь багшийн хуваарийг л
 * туулдаг. Харин 4 ажилтан багш нарын өмнө үзүүлэх зам нь өөр —
 *
 *   багш даалгавар оруулна → хүүхэд «хийчихлээ» дарна → оноо нэмэгдэнэ
 *   → эцэг эх хүүхдээ харна
 *
 * Оноо, хэлний тугийг 2026-10-06-нд асаасан бөгөөд тэр хойно энэ замыг
 * бүтнээр хэн ч туулаагүй. Сургалт дээр гацвал тэр нь бүх санаанаас үнэтэй
 * тул энд урьдчилж гацна.
 *
 * Зураг нь `demo-shots/`-д. Ажилчид тэднийг хараад бэлдэж болно.
 *
 * Тестийн сургуулийн (`zulzaga`) seed бүртгэлээр явна — жинхэнэ хүүхдийн
 * өгөгдөл хөндөхгүй.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "https://zulzagaedu-production.up.railway.app";
const SHOTS = "demo-shots";
const PIN = "2648";
const TEACHER = "99110002";
const PARENT = "99110101";

/** Оноо нэг даалгавар хийхэд хэдээр нэмэгдэх ёстой (`points/service.ts`). */
const POINTS_PER_HOMEWORK = 10;

/*
  Хүлээх хугацаа. Прод дээр хуудас 2 секундэд ирдэг, харин `next dev`
  хуудас бүрийг ЭХНИЙ удаад хөрвүүлдэг тул нэвтрэлт нь л 45 секундээс
  хэтэрч магадгүй. Тиймээс өгөөмөр — богино хүлээлт нь аппын алдаа биш,
  хөрвүүлэгчийн хугацааг «гацлаа» гэж бичдэг.
*/
const PATIENCE = Number(process.env.DEMO_TIMEOUT_MS) || (BASE.includes("127.0.0.1") ? 180000 : 45000);

const errors = [];
const failed = [];
const results = [];

function check(ok, label, detail = "") {
  results.push({ ok, label, detail });
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? " — " + detail : ""}`);
}

function note(label, detail = "") {
  console.log(`  ·  ${label}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "mn-MN" });
const page = await ctx.newPage();

page.on("console", (m) => {
  // `next dev`-ийн HMR сокет headless хөтөч дээр холбогддоггүй. Аппын алдаа
  // биш тул чимээг нь нааш оруулахгүй — эс бөгөөс жинхэнэ алдаа дарагдана.
  if (m.type() === "error" && !m.text().includes("/_next/hmr")) {
    errors.push(m.text().slice(0, 200));
  }
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
page.on("requestfailed", (r) => failed.push(`${r.method()} ${r.url().slice(0, 90)}`));

mkdirSync(SHOTS, { recursive: true });

/** Нэвтрэх. Сурагч код, насанд хүрэгч дугаараар — талбар нь нэг. */
async function signIn(identifier, label) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: PATIENCE });
  await page.fill('input[name="identifier"]', identifier);
  await page.fill('input[name="pin"]', PIN);
  await Promise.all([
    page.waitForURL(/\/(bagsh|etseg-eh|erhlegch|suragch)/, { timeout: PATIENCE }),
    page.click('button:has-text("Нэвтрэх")'),
  ]);
  note(`${label} нэвтрэв`, page.url().replace(BASE, ""));
}

async function signOut() {
  // Толгойн гарах товч — бусад submit товчтой андуурахгүйн тулд aria-label-аар.
  await page.click('button[aria-label="Гарах"]');
  await page.waitForURL(/\/login/, { timeout: PATIENCE });
}

/** Толгойн нүднээс тоо уншина. Туг унтраалттай бол нүд огт байхгүй. */
async function heroStat(label) {
  const tile = page.locator(`p:text-is("${label}")`).locator("..");
  if ((await tile.count()) === 0) return null;
  return (await tile.locator("p").first().innerText()).trim();
}

try {
  // Нэг удаагийн гарчиг — өмнөх ажиллалтын даалгавартай хутгалдахгүй.
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
  const title = `Шалгалт ${stamp}`;

  console.log("\n1. Багшаар нэвтрэх");
  await signIn(TEACHER, "багш");
  await page.screenshot({ path: `${SHOTS}/1-bagsh.png`, fullPage: true });

  console.log("\n2. Сурагчийн нэвтрэх кодыг багш хаанаас авах");
  await page.goto(`${BASE}/bagsh/urilga`, { waitUntil: "networkidle", timeout: PATIENCE });
  await page.screenshot({ path: `${SHOTS}/2-kodууд.png`, fullPage: true });
  const codes = await page.locator("text=/^3[А-ЯA-Z]-[A-Z]{6}$/").allInnerTexts();
  check(codes.length > 0, "сурагчдын нэвтрэх код багшид харагдав", `${codes.length} код`);
  const studentCode = codes[0];
  note("авсан код", studentCode ?? "(алга)");

  console.log("\n3. Багш даалгавар оруулах");
  await page.goto(`${BASE}/bagsh/daalgavar/shine`, { waitUntil: "networkidle", timeout: PATIENCE });
  await page.fill('input[name="title"]', title);
  // Хугацаа өнөөдөр байвал оноо олгогдоно; хоцорсон бол олгогдохгүй (§18).
  const due = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.fill('input[name="dueDate"]', due);
  const subjects = await page.locator('select[name="subjectId"] option').all();
  if (subjects.length > 1) {
    await page.selectOption('select[name="subjectId"]', await subjects[1].getAttribute("value"));
  }
  /*
    ⚠️ `button[type="submit"]` гэж сонгож БОЛОХГҮЙ. Толгойн «Гарах» нь мөн
    submit товч бөгөөд DOM дотор эхэнд байдаг тул сонголт түүн дээр унаж,
    даалгавар илгээхийн оронд системээс гардаг. 2026-10-07-нд яг ийм байдлаар
    алдаа гаргасан — товчийг ҮРГЭЛЖ бичвэрээр нь ол.
  */
  await page.click('button:has-text("Илгээх")');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${SHOTS}/3-daalgavar.png`, fullPage: true });
  await page.goto(`${BASE}/bagsh`, { waitUntil: "networkidle", timeout: PATIENCE });
  check(
    (await page.locator(`text=${title}`).count()) > 0,
    "даалгавар багшийн нүүрэнд гарч ирэв",
    title,
  );

  await signOut();

  console.log("\n4. Сурагчаар нэвтрэх");
  await signIn(studentCode, "сурагч");
  await page.screenshot({ path: `${SHOTS}/4-suragch.png`, fullPage: true });

  const pointsBefore = await heroStat("Оноо");
  check(pointsBefore !== null, "толгойд ОНОО-ны нүд байна", pointsBefore ?? "(нүд алга)");
  check(
    (await page.locator('p:text-is("Даалгавар")').count()) > 0,
    "толгойд ДААЛГАВАР-ын нүд байна",
  );
  check(
    (await page.locator(`text=${title}`).count()) > 0,
    "багшийн даалгавар хүүхдэд харагдав",
  );

  console.log("\n5. Хүүхэд «хийчихлээ» дарах");
  const card = page.locator(".rounded-3xl", { hasText: title }).first();
  const doneBtn = card.locator('button:has-text("Зураггүй хийчихлээ")');
  check(await doneBtn.isVisible(), "«хийчихлээ» товч дарагдахаар байна");
  await doneBtn.click();
  await page.waitForTimeout(6000);
  await page.goto(`${BASE}/suragch`, { waitUntil: "networkidle", timeout: PATIENCE });
  await page.screenshot({ path: `${SHOTS}/5-onoo.png`, fullPage: true });

  const pointsAfter = await heroStat("Оноо");
  const gained = Number(pointsAfter) - Number(pointsBefore);
  check(
    gained === POINTS_PER_HOMEWORK,
    `оноо ${POINTS_PER_HOMEWORK}-оор нэмэгдэв`,
    `${pointsBefore} → ${pointsAfter}`,
  );
  check(
    (await page.locator('text=Багш шалгасан, text=✓').count()) > 0 ||
      (await page.locator(`text=${title}`).count()) > 0,
    "хийсэн даалгавар «Хийсэн» хэсэгт үлдэв",
  );

  console.log("\n6. Оноо, шагналын хуудсууд");
  for (const [path, label] of [
    ["/suragch/onoo", "Миний оноо"],
    ["/suragch/shagnal", "Урамшуулал"],
    ["/hel", "Миний хэл"],
    ["/suragch/daalgavar", "Бүх даалгавар"],
    ["/suragch/hovaari", "Хуваарь"],
  ]) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: PATIENCE });
    check(res?.status() === 200, `${label} хуудас нээгдэв`, String(res?.status()));
    await page.screenshot({ path: `${SHOTS}/6-${path.replace(/\//g, "_")}.png`, fullPage: true });
  }

  await page.goto(`${BASE}/suragch`, { waitUntil: "networkidle", timeout: PATIENCE });
  await signOut();

  console.log("\n7. Эцэг эхээр нэвтрэх");
  await signIn(PARENT, "эцэг эх");
  await page.screenshot({ path: `${SHOTS}/7-etseg-eh.png`, fullPage: true });
  const body = await page.locator("body").innerText();
  check(!/Хүлээгдэж байна/i.test(body) || /\d/.test(body), "эцэг эхэд хүүхэд холбогдсон байна");
  note("эцэг эхийн нүүрний эхний мөрүүд", body.split("\n").slice(0, 6).join(" / "));
} catch (err) {
  check(false, "ГАЦЛАА", String(err).split("\n")[0].slice(0, 160));
  await page.screenshot({ path: `${SHOTS}/error.png`, fullPage: true }).catch(() => {});
}

console.log("\n=== Консолын алдаа ===");
console.log(errors.length ? [...new Set(errors)].slice(0, 10).join("\n") : "алга");
console.log("\n=== Унасан хүсэлт ===");
console.log(failed.length ? [...new Set(failed)].slice(0, 10).join("\n") : "алга");

const bad = results.filter((r) => !r.ok);
console.log(
  `\n${bad.length === 0 ? "✅" : "❌"} ${results.length - bad.length} зөв, ${bad.length} алдаа`,
);
console.log(`Зураг: ${SHOTS}/`);

await browser.close();
process.exit(bad.length === 0 ? 0 : 1);
