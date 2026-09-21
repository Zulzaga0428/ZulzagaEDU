import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BookOpen, Calculator, NotebookPen, PartyPopper, Sparkles } from "lucide-react";
import { db } from "@/server/db";
import { classMembers, classes, users } from "@/server/db/schema";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Bar, Card, Empty, FeatureCard, SectionLabel } from "@/components/ui";
import { IconBox } from "@/components/ui";
import { myHomework } from "@/server/homework/service";
import type { StudentHomeworkRow } from "@/server/homework/service";
import { groupByDue, studentHeadline } from "@/server/homework/grouping";
import { formatDueUb } from "@/server/homework/time";
import { markDoneAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Сурагчийн нүүр — 1–5 ангийн хүүхдэд.
 *
 *   · хувь биш, тоо — «78%» гэдгийг 7 настай ойлгохгүй
 *   · хоцорсныг зэмлэхгүй — улаан анхааруулга байхгүй
 *   · товч том — жижиг хуруунд
 */

/** Хичээлийн нэрээр дүрс сонгоно — хүүхэд үсэг уншихаас өмнө дүрсээ таньдаг. */
function subjectIcon(subject: string | null) {
  const s = (subject ?? "").toLowerCase();
  if (s.includes("матем")) return { icon: Calculator, tint: "шар" as const };
  if (s.includes("хэл")) return { icon: BookOpen, tint: "цэнхэр" as const };
  return { icon: NotebookPen, tint: "ягаан" as const };
}

function Task({ h, when }: { h: StudentHomeworkRow; when: string }) {
  const { icon, tint } = subjectIcon(h.subject);
  return (
    <Card>
      <div className="flex items-start gap-3">
        <IconBox icon={icon} tint={tint} size="том" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-tight text-ink">{h.title}</p>
          <p className="text-xs text-ink-faint">
            {h.subject ?? "Хичээл"} · {when}
          </p>
        </div>
      </div>

      {h.description && (
        <p className="mt-3 whitespace-pre-line rounded-2xl bg-surface-soft px-4 py-3 text-sm text-ink-soft">
          {h.description}
        </p>
      )}

      <form action={markDoneAction} className="mt-3">
        <input type="hidden" name="homeworkId" value={h.id} />
        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Хийчихлээ
        </button>
      </form>
    </Card>
  );
}

export default async function StudentHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect("/");

  const [[me], [myClass], items] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, viewer.userId)).limit(1),
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
  const now = g.overdue.length + g.today.length;
  const finished = items.filter((h) => h.status !== "ASSIGNED");
  const firstName = (me?.name ?? "").trim().split(/\s+/).pop() ?? "";
  const pct = g.totalCount === 0 ? 0 : Math.round((g.doneCount / g.totalCount) * 100);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Сурагчийн орон зай"
      title={`Сайн уу, ${firstName}`}
      subtitle="Жижиг алхам бүр чинь ахиц юм."
    >
      <FeatureCard
        icon={g.pendingCount === 0 ? PartyPopper : Sparkles}
        tint={g.pendingCount === 0 ? "ногоон" : "цэнхэр"}
        eyebrow="Өнөөдөр"
        title={studentHeadline(g)}
      >
        {myClass?.name ? `${myClass.name} анги` : "Ангид ороогүй"}
      </FeatureCard>

      {g.totalCount > 0 && (
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold text-ink">
              {g.totalCount} даалгавраас {g.doneCount} нь хийгдсэн
            </p>
            <p className="text-sm font-extrabold text-brand">{pct}%</p>
          </div>
          <div className="mt-2">
            <Bar percent={pct} label={`${g.totalCount}-аас ${g.doneCount} нь хийгдсэн`} />
          </div>
        </Card>
      )}

      {now > 0 && (
        <section>
          <SectionLabel>Одоо хийх</SectionLabel>
          <div className="space-y-3">
            {g.overdue.map((h) => (
              <Task key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл байсан`} />
            ))}
            {g.today.map((h) => (
              <Task key={h.id} h={h} when="өнөөдөр хүртэл" />
            ))}
          </div>
        </section>
      )}

      {g.upcoming.length > 0 && (
        <section>
          <SectionLabel>Дараа</SectionLabel>
          <div className="space-y-3">
            {g.upcoming.map((h) => (
              <Task key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл`} />
            ))}
          </div>
        </section>
      )}

      {g.totalCount === 0 && <Empty icon={BookOpen}>Даалгавар алга. Амарч байгаарай 🌿</Empty>}

      {finished.length > 0 && (
        <section>
          <SectionLabel>Хийсэн</SectionLabel>
          <div className="space-y-2">
            {finished.map((h) => (
              <Card key={h.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold text-ink-soft">{h.title}</span>
                  {/* Багш харсан эсэх нь хүүхдийн хувьд шагнал — ялгаж харуулна. */}
                  <span className="shrink-0 text-xs font-bold text-dot-parent">
                    {h.status === "CHECKED" ? "Багш шалгасан ✓" : "✓"}
                  </span>
                </div>
                {h.teacherNote && (
                  <p className="mt-2 rounded-2xl bg-surface-soft px-4 py-3 text-sm text-ink">
                    Багш: {h.teacherNote}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
