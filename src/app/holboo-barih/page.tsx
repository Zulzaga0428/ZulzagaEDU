import Link from "next/link";
import { LeadForm } from "@/components/lead-form";

export const metadata = { title: "Холбоо барих — Zulzaga EDU" };

/**
 * Сургуульд нэвтрүүлэх хүсэлт.
 *
 * ⚠️ Өмнө нь `+976 0000 0000` гэсэн орлуулагч дугаар байв. Захирал дарж
 * залгаад юу ч болохгүй — **хуурамч дугаар бол дугааргүй байхаас муу**.
 *
 * Жинхэнэ дугаар бэлэн болоход энд нэмнэ. Тэр хүртэл маягт: захирал
 * мэдээллээ үлдээнэ, бид холбогдоно. Залгасан дуудлага мартагддаг,
 * бичигдсэн хүсэлт мартагддаггүй (`docs/DECISIONS.md` §21).
 */
export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-[560px] px-5 pb-16 pt-12">
      <Link href="/" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-navy">
        Сургуульдаа нэвтрүүлэх
      </h1>

      <p className="mt-4 leading-relaxed text-ink-soft">
        Zulzaga EDU сургуульд <strong className="text-ink">үнэгүй</strong>. Нэг ангиар
        эхэлж, багш нар хэрхэн ашиглахыг хамт харна. Мэдээллээ үлдээвэл бид тань
        руу холбогдоно.
      </p>

      <div className="mt-6">
        <LeadForm />
      </div>

      <div className="mt-8 rounded-2xl bg-surface-soft px-5 py-5">
        <h2 className="font-extrabold text-navy">Юу болох вэ</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
          <li>· Бид залгаж, 10 минут ярина</li>
          <li>· Нэг багш, нэг ангиар эхэлнэ</li>
          <li>· Хоёр долоо хоног туршина — гэрээ, төлбөр байхгүй</li>
          <li>· Таалагдахгүй бол зогсооно</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-ink-faint">
        Сургууль, багш, сурагчид үүрд үнэгүй.
      </p>
    </main>
  );
}
