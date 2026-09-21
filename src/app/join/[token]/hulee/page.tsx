import Link from "next/link";
import { Clock } from "lucide-react";

export const metadata = { title: "Хүлээгдэж байна — Zulzaga EDU" };

/** Урилга хүлээн авсны дараах дэлгэц. */
export default function WaitingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-5 px-5 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warn-bg">
        <Clock className="h-8 w-8 text-accent" strokeWidth={2.2} />
      </span>

      <h1 className="text-2xl font-extrabold text-navy">Хүсэлт илгээгдлээ</h1>

      <p className="leading-relaxed text-ink-soft">
        Багш танийг хүүхэдтэй тань холбосныг баталгаажуулмагц хүүхдийнхээ даалгаврыг
        харж эхэлнэ.
      </p>

      <p className="rounded-2xl bg-surface-soft px-5 py-4 text-sm text-ink-soft">
        Энэ алхам нь хүүхдийн мэдээллийг хамгаалахад зориулагдсан. Багш бүр хүсэлтийг
        өөрөө хардаг.
      </p>

      <Link
        href="/login"
        className="w-full rounded-2xl bg-brand px-4 py-4 text-lg font-extrabold text-brand-ink hover:bg-brand-strong"
      >
        Нэвтрэх
      </Link>

      <p className="text-xs text-ink-faint">
        Дугаараа болон өөрийн тавьсан PIN-ээ ашиглана.
      </p>
    </main>
  );
}
