import Link from "next/link";

export const metadata = { title: "Холбоо барих — Zulzaga EDU" };

/**
 * ⚠️ ОРЛУУЛАГЧ УТГА. Zulzaga жинхэнэ утас, имэйлээ өгөх ёстой.
 * Сургуулийн эрхлэгч энэ хуудсыг хараад залгана — буруу мэдээлэл байвал
 * хамгийн үнэтэй алдаа энд гарна.
 */
const PHONE = "+976 0000 0000";
const EMAIL = "hello@zulzagaedu.mn";

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
        Zulzaga EDU-г сургуульдаа туршиж үзэхийг хүсвэл холбогдоно уу. Нэг ангиар
        эхэлж, багш нар хэрхэн ашиглахыг хамт харна.
      </p>

      <div className="mt-8 space-y-3">
        <a
          href={`tel:${PHONE.replace(/\s/g, "")}`}
          className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4 hover:border-brand"
        >
          <span className="text-sm text-ink-faint">Утас</span>
          <span className="font-bold text-ink">{PHONE}</span>
        </a>

        <a
          href={`mailto:${EMAIL}?subject=${encodeURIComponent("Zulzaga EDU — сургуулийн хүсэлт")}`}
          className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4 hover:border-brand"
        >
          <span className="text-sm text-ink-faint">Имэйл</span>
          <span className="font-bold text-ink">{EMAIL}</span>
        </a>
      </div>

      <div className="mt-8 rounded-2xl bg-surface-soft px-5 py-5">
        <h2 className="font-extrabold text-navy">Холбогдохдоо дараахыг бичвэл хурдан болно</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
          <li>· Сургуулийн нэр</li>
          <li>· Хэдэн ангид туршихыг хүсэж байгаа</li>
          <li>· Танай сургуульд ойролцоогоор хэдэн сурагч байдаг</li>
        </ul>
      </div>
    </main>
  );
}
