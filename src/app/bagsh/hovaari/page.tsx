import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, SectionLabel } from "@/components/ui";
import { CalendarDays } from "lucide-react";
import { myClasses, schoolSubjects } from "@/server/homework/service";
import { DAYS, MAX_PERIODS, teacherWeek } from "@/server/schedule/service";
import { saveWeekAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Хичээлийн хуваарь оруулах дэлгэц.
 *
 * Энгийн сервер форм — JavaScript-гүйгээр ч ажиллана. Багш улиралд нэг удаа
 * бөглөдөг тул хурдан бөглөгддөг байх нь хурдан ачаалагдахаас чухал.
 *
 * Зориуд ЖИЖИГ: огноо, улирал, ээлж, кабинет, багш солих байхгүй. Тэдгээрийг
 * оруулбал сургуулийн хуваарийн систем болж хувирна.
 */
export default async function SchedulePage({ searchParams }: PageProps<"/bagsh/hovaari">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const { hadgalsan } = await searchParams;

  const [classList, subjectList] = await Promise.all([
    myClasses(viewer),
    schoolSubjects(viewer),
  ]);
  if (classList.length === 0) redirect("/bagsh");

  const klass = classList[0];
  const current = await teacherWeek(viewer, klass.id);
  const at = (d: number, p: number) =>
    current.find((c) => c.dayOfWeek === d && c.period === p)?.subjectId ?? "";

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Багшийн орон зай"
      title="Хичээлийн хуваарь"
      subtitle={`${klass.name} анги · улиралд нэг удаа бөглөнө`}
    >
      <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      {hadgalsan && (
        <p
          role="status"
          className="rounded-xl border border-line bg-role-parent px-4 py-3 text-sm font-semibold text-ink"
        >
          Хуваарь хадгалагдлаа. Сурагч, эцэг эх хоёулаа харна.
        </p>
      )}

      {subjectList.length === 0 ? (
        <Empty icon={CalendarDays}>
          Хичээлийн жагсаалт хоосон байна. Эрхлэгчид хандана уу.
        </Empty>
      ) : (
        <form action={saveWeekAction} className="space-y-4">
          <input type="hidden" name="classId" value={klass.id} />

          {DAYS.map((dayName, i) => {
            const day = i + 1;
            return (
              <section key={day}>
                <SectionLabel>{dayName}</SectionLabel>
                <Card>
                  <div className="space-y-2">
                    {Array.from({ length: MAX_PERIODS }, (_, j) => {
                      const period = j + 1;
                      return (
                        <label key={period} className="flex items-center gap-3">
                          <span className="w-6 shrink-0 text-center text-sm font-bold text-ink-faint">
                            {period}
                          </span>
                          <select
                            name={`c-${day}-${period}`}
                            defaultValue={at(day, period)}
                            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                          >
                            <option value="">— хичээл алга —</option>
                            {subjectList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </Card>
              </section>
            );
          })}

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand px-4 py-5 text-lg font-extrabold text-brand-ink shadow-[0_10px_24px_rgba(43,133,246,0.28)] hover:bg-brand-strong"
          >
            Хадгалах
          </button>

          <p className="text-center text-xs text-ink-faint">
            Хоосон үлдээсэн цагт хичээл байхгүй гэж үзнэ.
          </p>
        </form>
      )}
    </AppShell>
  );
}
