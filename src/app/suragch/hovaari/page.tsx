import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty } from "@/components/ui";
import { DAYS, lessonName, myWeek } from "@/server/schedule/service";

export const dynamic = "force-dynamic";

/**
 * Сурагчийн хичээлийн хуваарь — долоо хоногоор.
 *
 * Нүүрэн дээр зөвхөн **маргаашийн** хичээл гардаг: оройн гол асуулт тэр.
 * Энэ хуудас бүтэн долоо хоногийг харуулна — «Пүрэвт юу байдаг билээ» гэж
 * асуухад л хэрэгтэй, өдөр бүр биш.
 *
 * Багш улиралд нэг удаа бөглөдөг тул энд засах зүйл байхгүй, зөвхөн харна.
 */
export default async function StudentSchedulePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect("/");

  const week = await myWeek(viewer);

  // Өдрөөр нь бүлэглэнэ. Хичээлгүй өдрийг огт харуулахгүй — хоосон багана
  // хүүхдийн дэлгэц дээр зүгээр л чимээ.
  const byDay = DAYS.map((label, i) => ({
    label,
    day: i + 1,
    lessons: week.filter((l) => l.dayOfWeek === i + 1).sort((a, b) => a.period - b.period),
  })).filter((d) => d.lessons.length > 0);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Хуваарь"
      title="Хичээлийн хуваарь"
      subtitle="Долоо хоногийн бүтэн хуваарь."
    >
      <Link href="/suragch" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      {byDay.length === 0 ? (
        <Empty icon={CalendarDays}>
          Багш хуваарь оруулаагүй байна. Оруулмагц энд харагдана.
        </Empty>
      ) : (
        byDay.map((d) => (
          <section key={d.day}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
              {d.label}
            </h2>
            <Card>
              <ol className="space-y-2">
                {d.lessons.map((l) => (
                  <li key={`${l.dayOfWeek}-${l.period}`} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-sm font-bold text-ink-faint"
                    >
                      {l.period}
                    </span>
                    <span className="font-semibold text-ink">{lessonName(l)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        ))
      )}
    </AppShell>
  );
}
