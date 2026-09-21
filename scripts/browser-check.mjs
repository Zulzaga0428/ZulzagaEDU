/**
 * Жинхэнэ хөтчөөр урсгалыг дамжина.
 *
 *   node scripts/browser-check.mjs [хаяг]
 *
 * curl-ийн тест сервер зөв ажиллаж байгааг батална. Гэхдээ хэрэглэгч хөтөч
 * дээр байдаг — JS алдаа, hydration унах, товч хариу өгөхгүй байх зэргийг
 * зөвхөн энд олно.
 *
 * Консолын алдаа, хүсэлтийн уналтыг бүгдийг нь бичнэ.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "https://zulzagaedu-production.up.railway.app";
const SHOTS = "browser-shots";

const errors = [];
const failed = [];

function log(step, detail = "") {
  console.log(`  ${step}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "mn-MN" });
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 200));
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));
page.on("requestfailed", (r) => failed.push(`${r.method()} ${r.url().slice(0, 90)}`));

mkdirSync(SHOTS, { recursive: true });

try {
  console.log("\n1. Нэвтрэх хуудас");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
  await page.screenshot({ path: `${SHOTS}/1-login.png`, fullPage: false });
  log("гарчиг", await page.title());

  console.log("\n2. Багшаар нэвтрэх");
  await page.fill('input[name="identifier"]', "99110002");
  await page.fill('input[name="pin"]', "2648");
  await Promise.all([
    page.waitForURL(/\/(bagsh|etseg-eh|erhlegch|suragch)/, { timeout: 45000 }),
    page.click('button[type="submit"]'),
  ]);
  log("хаяг", page.url().replace(BASE, ""));
  await page.screenshot({ path: `${SHOTS}/2-bagsh.png`, fullPage: true });

  console.log("\n3. Хуваарь руу очих");
  await page.goto(`${BASE}/bagsh/hovaari`, { waitUntil: "networkidle", timeout: 45000 });
  const before = await page.locator("select").first().inputValue();
  log("эхний нүдний утга", before || "(хоосон)");

  const options = await page.locator("select").first().locator("option").all();
  const subjectValue = await options[1].getAttribute("value");
  log("сонгох хичээл", (await options[1].textContent()) ?? "?");

  console.log("\n4. Хичээл сонгож хадгалах");
  await page.selectOption('select[name="c-2-1"]', subjectValue);
  await page.selectOption('select[name="c-2-2"]', subjectValue);

  const saveBtn = page.locator('button[type="submit"]', { hasText: "Хадгалах" });
  log("товч харагдаж байна уу", String(await saveBtn.isVisible()));

  await saveBtn.click();
  await page.waitForTimeout(4000);
  log("хадгалсны дараах хаяг", page.url().replace(BASE, ""));
  await page.screenshot({ path: `${SHOTS}/3-saved.png`, fullPage: true });

  console.log("\n5. Дахин ачаалж шалгах");
  await page.goto(`${BASE}/bagsh/hovaari`, { waitUntil: "networkidle", timeout: 45000 });
  const after = await page.locator('select[name="c-2-1"]').inputValue();
  const ok = after === subjectValue;
  log(ok ? "✅ ХАДГАЛАГДСАН" : "❌ ХАДГАЛАГДААГҮЙ", after || "(хоосон)");

  const summary = await page.locator("text=Одоогийн хуваарь").count();
  log("тойм харагдаж байна уу", summary > 0 ? "тийм" : "ҮГҮЙ");
} catch (err) {
  console.log("\n❌ Алдаа:", String(err).split("\n")[0].slice(0, 200));
  await page.screenshot({ path: `${SHOTS}/error.png`, fullPage: true }).catch(() => {});
}

console.log("\n=== Консолын алдаа ===");
console.log(errors.length ? errors.slice(0, 10).join("\n") : "алга");
console.log("\n=== Унасан хүсэлт ===");
console.log(failed.length ? failed.slice(0, 10).join("\n") : "алга");

await browser.close();
