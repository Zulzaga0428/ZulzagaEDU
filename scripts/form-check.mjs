/**
 * Даалгавар өгөх маягтыг жинхэнэ хөтчөөр шалгана.
 *
 *   npm run build && npx next start -p 3200
 *   node scripts/form-check.mjs http://127.0.0.1:3200
 *
 * ⚠️ ЗААВАЛ прод барилт дээр. `next dev` дээр клиент компонент hydration
 * хийдэггүй (`zulzaga-edu-v2-infra` Занга 9), тиймээс dev дээр гүйлгэвэл
 * «бүгд унасан» гэж хуурамчаар бичнэ.
 *
 * Юуг хамгаалж байна вэ (`docs/DECISIONS.md` §24): 2026-10-07-нд илэрсэн
 * прод дээрх алдаа — багш «Илгээх» дарахад даалгавар үүсдэг ч хуудас
 * хөдөлдөггүй, талбар бөглөөстэй хэвээр үлдэж, багш дахин дарж ХОЁР ижил
 * даалгавар үүсгэдэг байв. Чимээгүй алдаа тул тест нь зөвхөн «үүссэн эсэх»
 * биш, **багш юу ХАРСАН** гэдгийг шалгана.
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:3200";
const PIN = "2648";
const TEACHER = "99110002";

const problems = [];
const ok = (l, d = "") => console.log(`  ✅ ${l}${d ? " — " + d : ""}`);
const bad = (l, d = "") => {
  problems.push(l);
  console.log(`  ❌ ${l}${d ? " — " + d : ""}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "mn-MN" });
const page = await ctx.newPage();

try {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.fill('input[name="identifier"]', TEACHER);
  await page.fill('input[name="pin"]', PIN);
  await Promise.all([
    page.waitForURL(/\/bagsh/, { timeout: 60000 }),
    // ⚠️ Бичвэрээр. Нэвтэрсний дараа `button[type=submit]`-ын эхнийх нь
    // толгойн «Гарах» товч (Занга 8).
    page.click('button:has-text("Нэвтрэх")'),
  ]);

  const TEXT = `Шалгалт ${new Date().toISOString().slice(11, 19)}`;

  console.log("\n1. Бичсэн зүйл хуудас унахад амьд үлдэх");
  await page.goto(`${BASE}/bagsh/daalgavar/shine`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.fill('input[name="title"]', TEXT);
  await page.waitForTimeout(1100); // ноорог 400мс-ын дараа хадгалагдана
  // Бүтэн дахин ачаалалт = 500, сүлжээний тасалдал, PIN дуусахтай адил.
  await page.reload({ waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2800);
  (await page.locator("text=Өмнө бичиж байсан зүйл байна").count())
    ? ok("сэргээх санал гарав")
    : bad("бичсэн зүйл алга болов");
  await page.click('button:has-text("Сэргээх")');
  await page.waitForTimeout(700);
  (await page.inputValue('input[name="title"]')) === TEXT
    ? ok("текст бүтнээр сэргэв")
    : bad("текст дутуу сэргэв");

  console.log("\n2. Илгээхэд багш юу харах вэ");
  await page.locator('button:has-text("Илгээх")').click();
  await page.waitForTimeout(900);
  const label = (await page.locator('button[type="submit"]').last().innerText()).trim();
  label.includes("Илгээж байна")
    ? ok("товч хаагдав — хоёр дахин дарах зам байхгүй", label)
    : bad("товч нээлттэй хэвээр — давхар даалгавар үүсэх зам", label);
  await page
    .waitForURL(/\/bagsh$/, { timeout: 30000 })
    .then(() => ok("хуудас /bagsh руу солигдлоо"))
    .catch(() => bad("хуудас хөдлөөгүй — багш «болоогүй» гэж бодно", page.url()));
  await page.waitForTimeout(1500);
  (await page.evaluate(
    () => Object.keys(localStorage).filter((k) => k.startsWith("zedu.hw-draft.v1.")).length,
  )) === 0
    ? ok("ноорог цэвэрлэгдэв")
    : bad("ноорог үлдэж, дараагийн даалгаварт санал болгоно");
  (await page.locator(`text=${TEXT}`).count())
    ? ok("даалгавар багшийн нүүрэнд харагдав")
    : bad("нүүрэнд харагдсангүй");

  console.log("\n3. Дахин нээхэд хуурамч санал байхгүй");
  await page.goto(`${BASE}/bagsh/daalgavar/shine`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500);
  (await page.locator("text=Өмнө бичиж байсан зүйл байна").count()) === 0
    ? ok("хоосон санал гарсангүй")
    : bad("илгээчихсэн зүйлийг дахин санал болгов");

  console.log("\n4. Бүтэлгүйтвэл шалтгаан харагдах ёстой");
  await page.locator('button:has-text("Илгээх")').click();
  await page.waitForTimeout(5000);
  (await page.locator("text=Юу хийхийг бич").count())
    ? ok("алдааны шалтгаан дэлгэцэн дээр гарав")
    : bad("чимээгүй үлдэв — хамгийн хортой зан");
} catch (err) {
  bad("ГАЦЛАА", String(err).split("\n")[0].slice(0, 160));
}

await browser.close();
console.log(problems.length ? `\n❌ ${problems.length} асуудал` : "\n✅ Бүгд зөв");
process.exit(problems.length ? 1 : 0);
