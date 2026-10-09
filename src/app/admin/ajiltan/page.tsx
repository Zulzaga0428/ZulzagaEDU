import Link from "next/link";
import { redirect } from "next/navigation";
import { readAdminSession } from "@/server/admin/session";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ажилтны гарын авлага — Zulzaga EDU",
  robots: { index: false, follow: false },
};

/**
 * Талбарт ажиллах багийн гарын авлага (`docs/DECISIONS.md` §20).
 *
 * Админы сессийн ард — захирал санамсаргүй нээж, «яриа» гэдгийг харах нь
 * эвгүй. Утсан дээр уншихаар бичсэн: богино хэсгүүд, том үсэг.
 *
 * ⚠️ **Гол санаа:** ажилтны зорилго «сургууль нэмэх» БИШ. Барилгаас
 * гарахаасаа өмнө нэг багш нэг даалгавар оруулсан байх. Сургууль үүсгэх нь
 * тохируулга, даалгавар орох нь амжилт.
 */

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-brand-ink"
      >
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-extrabold text-ink">{title}</p>
        <div className="mt-0.5 text-sm leading-relaxed text-ink-soft">{children}</div>
      </div>
    </li>
  );
}

function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="font-extrabold text-ink">{q}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

/**
 * Сайтын хаяг — бичиж хатуу тавихгүй. 2026-10-09 хүртэл энд `zulzagaedu.mn`
 * гэж бичигдсэн байсан нь ажиллахгүй хаяг байв. `APP_URL`-аас авбал домэйн
 * солигдоход ч өөрөө зөв болно.
 */
function siteHostOf(appUrl: string | undefined): string {
  try {
    return appUrl ? new URL(appUrl).host : "edu.zulzaga.app";
  } catch {
    return "edu.zulzaga.app";
  }
}

export default async function FieldGuidePage() {
  const siteHost = siteHostOf(process.env.APP_URL);
  const admin = await readAdminSession();
  if (!admin) redirect("/admin");

  return (
    <main className="mx-auto w-full max-w-[640px] space-y-6 px-5 pb-16 pt-8 print:pt-4">
      <Link href="/admin" className="text-sm font-bold text-brand hover:underline print:hidden">
        ← Админ
      </Link>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
          Ажилтны гарын авлага
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy">
          Юу хийх вэ
        </h1>
      </header>

      <section className="rounded-3xl border-2 border-brand bg-role-teacher p-5">
        <p className="text-lg font-extrabold text-navy">
          Зорилго нь сургууль нэмэх БИШ.
        </p>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Барилгаас гарахаасаа өмнө <strong className="text-ink">нэг багш нэг даалгавар
          оруулсан</strong> байх. Захирал зөвшөөрсөн ч багш эхлээгүй бол юу ч болоогүй.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Админ дэлгэцэн дээрх «Даалгавар» багана л жинхэнэ. Бусад тоо бол тохируулга.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Захиралд хэлэх — 2 минут
        </h2>
        <div className="mt-3 space-y-3 rounded-3xl border border-line bg-surface p-5">
          <p className="text-lg font-extrabold text-ink">«Сургуульд тань үнэгүй.»</p>
          <p className="text-sm leading-relaxed text-ink-soft">
            Энэ өгүүлбэрээр эхэл. Үнээр нь яриа эхлэхгүй бол бусад бүхэн амар болно.
          </p>

          <hr className="border-line" />

          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="text-ink">Асуудал:</strong> багш самбар дээр даалгавраа
            бичнэ, 30 хүүхэд хуулна. Бага ангийн хүүхэд буруу хуулна. Гэртээ ээж нь
            уншиж чадахгүй. Тэгээд Facebook группт «өнөөдөр юу өгсөн бэ» гэж бичнэ.
            Багш орой 40 мессежид хариулна.
          </p>

          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="text-ink">Бидний хийдэг зүйл:</strong> багш самбараа
            зурагдаад илгээнэ. 3 секунд. Хүүхэд, эцэг эх хоёулаа багшийн самбарыг
            өөрийг нь харна. Хуулах алхам байхгүй болно.
          </p>

          <p className="text-sm leading-relaxed text-ink-soft">
            <strong className="text-ink">Яагаад үнэгүй вэ:</strong> даалгаврын хэсэг
            үүрд үнэгүй. Хожим эцэг эхэд нэмэлт боломж санал болгоно — сонголтоор.
            Сургуулиас мөнгө авахгүй.
          </p>

          <hr className="border-line" />

          <p className="text-sm leading-relaxed text-ink">
            <strong>Хүсэх зүйл:</strong> «Нэг багш, нэг анги, хоёр долоо хоног. Таалагдахгүй
            бол зогсооно. Гэрээ, үүрэг байхгүй.»
          </p>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-warn-line bg-warn-bg p-5">
        <h2 className="text-lg font-extrabold text-ink">
          «Бидэнд Багш систем бий» гэвэл
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Та үүнийг <strong className="text-ink">олон удаа сонсоно</strong>. Багш систем
          бол Монголын App Store-ын боловсролын ангилалд 1-р байранд явдаг, 10,000+
          татсан бодит бүтээгдэхүүн. Бэлэн байгаарай.
        </p>

        <div className="mt-4 space-y-3 rounded-2xl bg-surface p-4">
          <p className="text-sm leading-relaxed text-ink">
            <strong>1. Эхлээд зөвшөөр.</strong> «Сайн систем байгаа юм байна. Ирц,
            хуваариа тэндээ хөтлөөрэй — бид түүнийг орлохгүй.»
          </p>
          <p className="text-sm leading-relaxed text-ink">
            <strong>2. Дараа нь ялга.</strong> «Багш систем бол сургуулийн бүртгэл —
            ирц, хуваарь, тайлан. Бид ирц ч, дүн ч бүртгэдэггүй. Бид{" "}
            <strong className="text-brand">ганц зүйл</strong> хийдэг: багшийн самбар
            дээрх даалгавар эцэг эхэд зөв хүрэх.»
          </p>
          <p className="text-sm leading-relaxed text-ink">
            <strong>3. Асуу.</strong> «Одоо даалгавраа яаж дамжуулдаг вэ? Хүүхэд
            самбараас дэвтэртээ хуулдаг уу?» — Тийм гэвэл яг бидний асуудал. Тэр
            яриа нь чиний биш, <strong className="text-ink">түүний</strong> асуудлын
            тухай болно.
          </p>
          <p className="text-sm leading-relaxed text-ink">
            <strong>4. Үнэ.</strong> «Бид сургуулиас мөнгө авдаггүй. Нэмэлт төсөв
            шаардахгүй.»
          </p>
          <p className="text-sm leading-relaxed text-ink">
            <strong>5. Багшийн ачаалал.</strong> «Багш ирц оруулахад цаг зарцуулдаг.
            Бидэнд багш юу ч оруулдаггүй — самбараа зурагдана, 3 секунд.»
          </p>
        </div>

        <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm leading-relaxed text-ink">
          ⛔ <strong>Тэднийг бүү муул.</strong> Тэр системийг захирал өөрөө сонгосон.
          Сонголтыг нь шүүмжлэх нь түүнийг шүүмжилсэнтэй адил — яриа тэндээ дуусна.
          Бид орлох гэж ирээгүй, нөхөх гэж ирсэн.
        </p>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Захирлын асуух 5 асуулт
        </h2>
        <div className="mt-3 space-y-2">
          <QA q="Хэдэн төгрөг вэ?">
            Сургууль, багш, сурагчид үүрд үнэгүй. Танаас мөнгө авахгүй.
          </QA>
          <QA q="Эцэг эхээс мөнгө авах уу?">
            Даалгавар харах нь үүрд үнэгүй. Хожим нэмэлт боломж (хүүхдийн уншлагын
            хурдны хэмжилт гэх мэт) төлбөртэй байж болно — <strong className="text-ink">
            сонголтоор</strong>. Төлөөгүй эцэг эх юу ч алдахгүй.
          </QA>
          <QA q="Хүүхдийн мэдээлэл хаана байна, хэн харах вэ?">
            Эцэг эх багшийн баталгаа авч байж л өөрийн хүүхдийнхээ мэдээллийг харна.
            Багш зөвхөн өөрийн ангиа. Эрхлэгч <strong className="text-ink">тоо</strong>
            хардаг, ангийн доторх зүйлийг хардаггүй. Хүүхдийн дэвтрийн зургийг
            эрхлэгч ч харахгүй.
          </QA>
          <QA q="Багшид ачаалал нэмэх үү?">
            Эсрэгээрээ. Багш самбараа зурагдана — дахин бичихгүй. Аппаар дэвтэр
            шалгах шаардлагагүй, ангидаа хардаг шүү дээ. Facebook группт хариулах
            цаг нь буурна.
          </QA>
          <QA q="Ажиллахгүй бол яах вэ?">
            Хоёр долоо хоногийн дараа зогсооно. Гэрээ байхгүй, төлбөр байхгүй,
            үүрэг байхгүй.
          </QA>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Тохируулга — уулзалтын дотор
        </h2>
        <ol className="mt-3 space-y-4 rounded-3xl border border-line bg-surface p-5">
          <Step n={1} title="Сургууль үүсгэх">
            Админ дэлгэц → сургуулийн нэр, эрхлэгчийн нэр, утас. <strong className="text-ink">
            PIN нэг л удаа харагдана</strong> — «Хуулах» дараад эрхлэгчид шууд өг.
          </Step>
          <Step n={2} title="Эрхлэгч багш нэмэх">
            Эрхлэгч утсаараа нэвтэрнэ → «Багш ба анги» → багшийн нэр, утас.
            Багшийн PIN мөн нэг л удаа харагдана.
          </Step>
          <Step n={3} title="Анги үүсгээд багшид өгөх">
            Эрхлэгч анги үүсгэнэ (жишээ нь 3А), багшийг түүнд хуваарилна.
            <strong className="text-ink"> Ангигүй багш юу ч хийж чадахгүй</strong> — энэ
            алхмыг бүү алгас.
          </Step>
          <Step n={4} title="Багш ТЭР ДОР НЬ нэг даалгавар өгөх">
            Багш нэвтэрнэ → «Даалгавар өгөх» → <strong className="text-ink">«Самбараа
            зурагдах»</strong>. Самбар хоосон бол ямар ч цаасыг зурагдаж болно —
            чухал нь багш нэг удаа өөрөө хийж үзэх. Энэ алхамгүйгээр бүү гар.
          </Step>
          <Step n={5} title="Сурагч нэмэх, эцэг эхийг урих">
            Багш «Сурагч ба эцэг эх» → сурагч нэмнэ → QR гаргаад Messenger-ээр
            эцэг эхэд илгээнэ. Эцэг эх нэгдэхэд багш баталгаажуулна.
          </Step>
        </ol>
      </section>

      <section className="rounded-3xl border border-warn-line bg-warn-bg p-5">
        <h2 className="font-extrabold text-ink">⚠️ Амлаж БОЛОХГҮЙ зүйлс</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Эдгээр нь хийгдээгүй эсвэл унтраалттай байгаа. Амлаад өгч чадахгүй бол
          итгэл нэг дор унана.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
          <li>· <strong className="text-ink">Хэл сурах</strong> — товч нь байгаа, доторх
            агуулга нь хараахан алга. «Удахгүй нэмэгдэнэ» гэж хэл, «байна» гэж бүү хэл</li>
          <li>· <strong className="text-ink">ТВ нэвтрүүлэг</strong> — байхгүй</li>
          <li>· <strong className="text-ink">Дүн, ирц бүртгэл</strong> — байхгүй, хийхгүй</li>
          <li>· <strong className="text-ink">Excel-ээс сурагч импортлох</strong> — байхгүй, гараар нэмнэ</li>
          <li>· <strong className="text-ink">Google-ээр нэвтрэх</strong> — байхгүй, утас + PIN</li>
          <li>· <strong className="text-ink">Чат</strong> — бүлгийн чат байхгүй. Багш↔эцэг эх хоёрын хооронд л яриа бий</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Оноо ба шагнал
        </h2>
        <div className="mt-3 space-y-2 rounded-3xl border border-line bg-surface p-5 text-sm text-ink-soft">
          <p>
            Хүүхэд <strong className="text-ink">даалгавраа хийснээ тэмдэглэхэд 10 оноо</strong>,
            дэвтрийнхээ зургийг илгээвэл нэмэлт 5 оноо авна. Хэдэн өдөр завсарласны
            дараа эргэж ирвэл 15 оноо.
          </p>
          <p>
            Оноогоороо амьтан нээнэ (Муур үнэгүй, бусад нь 30–300 оноо).
          </p>
          <p className="rounded-xl bg-surface-soft px-3 py-2">
            ⚠️ <strong className="text-ink">Багш юу ч хийх шаардлагагүй.</strong> Багшийн
            шалгалт оноонд огт нөлөөлөхгүй — захирал асуувал ингэж хариул.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Гарахаасаа өмнө
        </h2>
        <ul className="mt-3 space-y-2 rounded-3xl border border-line bg-surface p-5 text-sm text-ink-soft">
          <li>☐ Эрхлэгч өөрийн утсаар нэвтэрсэн үү?</li>
          <li>☐ Багш өөрийн утсаар нэвтэрсэн үү?</li>
          <li>☐ Багш ангитай юу?</li>
          <li>☐ <strong className="text-ink">Багш нэг даалгавар оруулсан уу?</strong></li>
          <li>☐ Багш «Шинэ даалгаврын мэдэгдэл авах» товчийг дарсан уу?</li>
          <li>☐ Багшид <code className="font-mono">{siteHost}/tuslamj</code> хаягийг өгсөн үү?</li>
        </ul>
      </section>

      <p className="text-center text-xs text-ink-faint">
        Асуудал гарвал шууд Zulzaga-д бич. Таамаглаж бүү амла — мэдэхгүй зүйлээ
        «шалгаад хэлье» гэж хэлэх нь буруу амлахаас дээр.
      </p>
    </main>
  );
}
