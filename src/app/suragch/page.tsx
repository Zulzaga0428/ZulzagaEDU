import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes } from "@/server/db/schema";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { myHomework } from "@/server/homework/service";
import type { StudentHomeworkRow } from "@/server/homework/service";
import { groupByDue, studentHeadline } from "@/server/homework/grouping";
import { formatDueUb } from "@/server/homework/time";
import { markDoneAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Сурагчийн нүүр — 1–5 ангийн хүүхдэд.
 *
 * Гурван дүрэм:
 *   · хувь биш, тоо — «78%» гэдгийг 7 настай ойлгохгүй
 *   · хоцорсныг зэмлэхгүй — «өчигдрийнх» гэдэг хангалттай тодорхой.
 *     Апп дайсан мэт санагдвал хүүхэд дахиж нээхгүй
 *   · товч том — жижиг хуруунд
 */

function Task({ h, when }: { h: StudentHomeworkRow; when: string }) {
  return (
    <li className="rounded-2xl border border-line bg-surface px-4 py-4">
      <p className="text-lg font-extrabold text-ink">{h.title}</p>
      <p className="text-xs text-ink-faint">
        {h.subject ?? "Хичээл"} · {when}
      </p>
      {h.description && (
        <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{h.description}</p>
      )}

      <form action={markDoneAction} className="mt-4">
        <input type="hidden" name="homeworkId" value={h.id} />
        <button
          type="submit"
          className="w-full rounded-xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Хийчихлээ
        </button>
      </form>
    </li>
  );
}

export default async function StudentHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect("/");

  const [[myClass], items] = await Promise.all([
    db
      .select({ name: classes.name })
      .from(classes)
      .innerJoin(classMembers, eq(classMembers.classId, classes.id))
      .where(
        and(
          eq(classMembers.userId, viewer.userId),
          eq(classMembers.role, "STUDENT"),
          eq(classMembers.status, "ACTIVE"),
          eq(classes.schoolId, viewer.schoolId),
        ),
      )
      .limit(1),
    myHomework(viewer),
  ]);

  const g = groupByDue(items);
  const now = [...g.overdue, ...g.today];
  const finished = items.filter((h) => h.status !== "ASSIGNED");

  return (
    <AppShell viewer={viewer}>
      <h1 className="text-2xl font-extrabold text-navy">Сайн уу!</h1>
      <p className="mt-1 text-ink-soft">
        {myClass?.name ? `${myClass.name} анги` : "Ангид ороогүй"}
      </p>

      <p className="mt-5 rounded-2xl bg-surface-soft px-5 py-5 text-center text-xl font-extrabold text-ink">
        {studentHeadline(g)}
      </p>

      {g.totalCount > 0 && (
        <p className="mt-1.5 text-center text-xs text-ink-faint">
          {g.totalCount} даалгавраас {g.doneCount} нь хийгдсэн
        </p>
      )}

      {now.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Одоо хийх
          </h2>
          <ul className="mt-2 space-y-3">
            {g.overdue.map((h) => (
              <Task key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл байсан`} />
            ))}
            {g.today.map((h) => (
              <Task key={h.id} h={h} when="өнөөдөр хүртэл" />
            ))}
          </ul>
        </section>
      )}

      {g.upcoming.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Дараа</h2>
          <ul className="mt-2 space-y-3">
            {g.upcoming.map((h) => (
              <Task key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл`} />
            ))}
          </ul>
        </section>
      )}

      {finished.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Хийсэн</h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {finished.map((h) => (
              <li key={h.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold text-ink-soft">{h.title}</span>
                  {/* Багш харсан эсэх нь хүүхдийн хувьд шагнал — ялгаж харуулна. */}
                  <span className="shrink-0 text-xs font-bold text-dot-parent">
                    {h.status === "CHECKED" ? "Багш шалгасан ✓" : "✓"}
                  </span>
                </div>
                {h.teacherNote && (
                  <p className="mt-1 rounded-lg bg-surface-soft px-3 py-2 text-sm text-ink">
                    Багш: {h.teacherNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
