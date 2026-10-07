import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, SectionLabel } from "@/components/ui";
import { myClasses, schoolSubjects } from "@/server/homework/service";
import { DAYS, MAX_PERIODS, lessonName, teacherWeek } from "@/server/schedule/service";
import { SaveWeekForm } from "@/components/save-week-form";

export const dynamic = "force-dynamic";

/**
 * Хичээлийн хуваарь оруулах дэлгэц.
 *
 * Энгийн сервер форм — JavaScript-гүйгээр ч ажиллана.
 *
 * ⚠️ Эхний хувилбарт хадгалсны дараа ЮУ Ч ӨӨРЧЛӨГДӨӨГҮЙ мэт харагддаг
 * байлаа: сонгосон утгууд байрандаа үлддэг, баталгааны мэдэгдэл хуудасны
 * дээд талд гардаг, гэтэл багш доод талын товчны дэргэд байдаг. Ажиллаж
 * байгаа мөртөө «зүгээр refresh болоод байна» гэж харагдана.
 *
 * Тиймээс: дээд талд **одоо хадгалагдсан хуваарийн тойм** гарна (өөрчлөгдөхөд
 * нүдэнд харагдана), товч нь **доод талд наалдсан** байна, баталгаа нь
 * товчныхоо хажууд гарна.
 */
export default async function SchedulePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");


  const [classList, subjectList] = await Promise.all([
    myClasses(viewer),
    schoolSubjects(viewer),
  ]);

  /*
    ⚠️ Өмнө нь анги байхгүй багшийг чимээгүй буцаадаг байв. Багш товч дараад
    л эхний хуудсандаа эргэж ирдэг тул «апп ажиллахгүй байна» гэж харагддаг.
    Шалтгааныг нь хэлэх ёстой.
  */
  if (classList.length === 0) {
    return (
      <AppShell
        viewer={viewer}
        eyebrow="Багшийн орон зай"
        title="Хичээлийн хуваарь"
        subtitle="Хуваарь оруулахын тулд анги хэрэгтэй."
      >
        <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
          ← Буцах
        </Link>
        <Empty icon={CalendarDays}>
          Танд хариуцсан анги алга байна. Эрхлэгчээсээ анги хуваарилуулсны дараа
          энд хуваариа оруулна.
        </Empty>
      </AppShell>
    );
  }

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

      {/*
        Одоо хадгалагдсан зүйл. Хадгалахад энэ тойм өөрчлөгдөнө — багш үр
        дүнг НҮДЭЭР хардаг, мэдэгдэл уншихаас илүү найдвартай.
      */}
      <section>
        <SectionLabel>Одоогийн хуваарь</SectionLabel>
        {current.length === 0 ? (
          <Empty icon={CalendarDays}>Хараахан хадгалаагүй байна.</Empty>
        ) : (
          <Card>
            <ul className="space-y-1.5">
              {DAYS.map((dayName, i) => {
                const forDay = current
                  .filter((c) => c.dayOfWeek === i + 1)
                  .sort((a, b) => a.period - b.period);
                if (forDay.length === 0) return null;
                return (
                  <li key={dayName} className="flex gap-3 text-sm">
                    <span className="w-14 shrink-0 font-bold text-ink-faint">{dayName}</span>
                    <span className="text-ink">
                      {forDay.map((l) => lessonName(l)).join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-ink-faint">Нийт {current.length} хичээл</p>
          </Card>
        )}
      </section>

      {subjectList.length === 0 ? (
        <Empty icon={CalendarDays}>
          Хичээлийн жагсаалт хоосон байна. Эрхлэгчид хандана уу.
        </Empty>
      ) : (
        <SaveWeekForm classId={klass.id}>
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

        </SaveWeekForm>
      )}
    </AppShell>
  );
}
