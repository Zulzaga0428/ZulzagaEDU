import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Row, SectionLabel } from "@/components/ui";
import { GraduationCap } from "lucide-react";
import { schoolOverview } from "@/server/school/overview";

export const dynamic = "force-dynamic";

/**
 * Эрхлэгчийн самбар — компьютерт зориулсан өргөн хувилбар.
 *
 * ⛔ Даалгаврын агуулга энд ХЭЗЭЭ Ч гарахгүй. Зөвхөн тоо.
 * ⚠️ Нэршил: «идэвхгүй багш» биш «дэмжлэг хэрэгтэй анги».
 */
export default async function ManagerHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "ACADEMIC_MANAGER") redirect("/");

  const o = await schoolOverview(viewer);

  const stats = [
    { label: "Багш", value: o.teachers },
    { label: "Сурагч", value: o.students },
    { label: "Эцэг эх", value: o.parents },
    { label: "Энэ 7 хоногт", value: o.homeworkThisWeek, suffix: "даалгавар" },
  ];

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Эрхлэгчийн орон зай"
      title="Сургуулийн тойм"
      subtitle="Аль ангид дэмжлэг хэрэгтэйг долоо хоног бүр харна."
      wide
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface px-4 py-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              {s.label}
            </dt>
            <dd className="mt-1 text-3xl font-extrabold text-ink">{s.value}</dd>
            {s.suffix && <p className="text-xs text-ink-faint">{s.suffix}</p>}
          </div>
        ))}
      </dl>

      <section>
        <SectionLabel>Удирдлага</SectionLabel>
        <Row
          icon={GraduationCap}
          tint="ногоон"
          title="Багш ба анги"
          subtitle="Багш нэмэх, анги үүсгэх, хуваарилах"
          trailing={<span className="text-ink-faint">›</span>}
          href="/erhlegch/bagsh"
        />
      </section>

      {o.needsSupport.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
            Дэмжлэг хэрэгтэй · {o.needsSupport.length}
          </h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-warn-line bg-warn-bg">
            {o.needsSupport.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <span className="font-bold text-ink">{c.name} анги</span>
                <span className="ml-2 text-sm text-ink-soft">
                  энэ долоо хоногт даалгавар аваагүй
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">
            Шалтгаан нь янз бүр байж болно — өвчтэй, шалгалттай, эсвэл туслалцаа
            хэрэгтэй. Багштайгаа ярина уу.
          </p>
        </section>
      )}

      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Ангиуд</h2>
      {o.classes.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Анги үүсгээгүй байна.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {o.classes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <div>
                <span className="font-extrabold text-ink">{c.name} анги</span>
                <span className="ml-2 text-sm text-ink-faint">{c.students} сурагч</span>
              </div>

              <div className="flex items-center gap-6">
                <span className="text-sm text-ink-soft">
                  {c.homeworkThisWeek} даалгавар
                </span>

                {c.completion === null ? (
                  <span className="text-sm text-ink-faint">—</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-24 overflow-hidden rounded-full bg-surface-soft"
                      role="img"
                      aria-label={`гүйцэтгэл ${c.completion} хувь`}
                    >
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${c.completion}%` }}
                      />
                    </span>
                    <span className="w-10 text-right text-sm font-bold text-ink">
                      {c.completion}%
                    </span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
