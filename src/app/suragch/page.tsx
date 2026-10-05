import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BookOpen, CalendarDays, Megaphone, NotebookPen, PartyPopper, Sparkles } from "lucide-react";
import { db } from "@/server/db";
import { classMembers, classes, users } from "@/server/db/schema";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Bar, Card, Empty, FeatureCard, SectionLabel } from "@/components/ui";
import { IconBox } from "@/components/ui";
import { myHomework } from "@/server/homework/service";
import { groupByDue, studentHeadline } from "@/server/homework/grouping";
import { formatDueUb } from "@/server/homework/time";
import { lessonName, lessonsToday, myWeek, nextSchoolDay } from "@/server/schedule/service";
import { myAnnouncements } from "@/server/announce/service";
import { undoDoneAction } from "./actions";
import { StudentTask } from "@/components/student-task";
import { myAttachments } from "@/server/files/storage";
import { myPoints, pointsEnabled } from "@/server/points/service";
import { selectedAvatar } from "@/server/points/avatars";
import { Avatar } from "@/components/avatars";

export const dynamic = "force-dynamic";

/**
 * Сурагчийн нүүр — 1–5 ангийн хүүхдэд.
 *
 *   · хувь биш, тоо — «78%» гэдгийг 7 настай ойлгохгүй
 *   · хоцорсныг зэмлэхгүй — улаан анхааруулга байхгүй
 *   · товч том — жижиг хуруунд
 */

/** Хичээлийн нэрээр дүрс сонгоно — хүүхэд үсэг уншихаас өмнө дүрсээ таньдаг. */
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

  const week = await myWeek(viewer);
  const nextDay = nextSchoolDay(week);
  const todayLessons = lessonsToday(week);
  // Туг унтраалттай бол `null` — карт огт гарахгүй.
  const points = pointsEnabled() ? await myPoints(viewer) : null;
  // Аватар нь оноогүй ч толгойд гарна — хүүхэд бүр нүүртэй байх ёстой.
  const myAvatar = await selectedAvatar(viewer.userId);
  const notices = await myAnnouncements(viewer, 3);

  const g = groupByDue(items);
  const pending = [...g.overdue, ...g.today, ...g.upcoming];
  const photoMap = new Map<string, string[]>(
    await Promise.all(
      pending.map(async (h) => [h.id, await myAttachments(viewer, h.id)] as [string, string[]]),
    ),
  );
  const now = g.overdue.length + g.today.length;
  const finished = items.filter((h) => h.status !== "ASSIGNED");

  /*
    Буцаах товч зөвхөн зураггүй ажилд гарна. Зураг нь хийсний баталгаа тул
    түүнийг үлдээгээд «хийгээгүй» гэж тэмдэглэх нь зөрчилтэй. Сервер ч
    татгалздаг — энд шалгаж байгаа нь хүүхдийг алдаанд оруулахгүйн тулд.
  */
  const undoable = new Set(
    (
      await Promise.all(
        finished
          .filter((h) => h.status === "DONE")
          .map(async (h) => ((await myAttachments(viewer, h.id)).length === 0 ? h.id : null)),
      )
    ).filter((id): id is string => id !== null),
  );
  const firstName = (me?.name ?? "").trim().split(/\s+/).pop() ?? "";
  const pct = g.totalCount === 0 ? 0 : Math.round((g.doneCount / g.totalCount) * 100);

  return (
    <AppShell
      viewer={viewer}
      title={`Сайн уу, ${firstName}`}
      subtitle={myClass?.name ? `${myClass.name} анги` : "Ангид ороогүй"}
      hero={{
        avatar: <Avatar id={myAvatar} size={60} />,
        stats: [
          // Оноо нь тугийн ард. Унтраалттай бол зүгээр л энэ нүд гарахгүй.
          ...(points !== null ? [{ value: String(points), label: "Оноо" }] : []),
          { value: `${g.doneCount}/${g.totalCount}`, label: "Даалгавар" },
          { value: String(todayLessons), label: "Хичээл өнөөдөр" },
        ],
      }}
    >
      <FeatureCard
        icon={g.pendingCount === 0 ? PartyPopper : Sparkles}
        tint={g.pendingCount === 0 ? "ногоон" : "цэнхэр"}
        eyebrow="Өнөөдөр"
        title={studentHeadline(g)}
      >
        {g.totalCount === 0 ? "Багш даалгавар өгөөгүй байна." : "Жижиг алхам бүр чинь ахиц юм."}
      </FeatureCard>

      {/*
        Хуваарь, даалгавар доод nav-аас гарсан (Zulzaga, 2026-10-06) тул
        энд холбоно — хуудас нь үлдсэн, зам нь л өөрчлөгдсөн.
      */}
      {pointsEnabled() && (
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/suragch/daalgavar"
            className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-bold text-ink hover:border-brand"
          >
            <NotebookPen className="h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} />
            Бүх даалгавар
          </Link>
          <Link
            href="/suragch/hovaari"
            className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-bold text-ink hover:border-brand"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} />
            Хуваарь
          </Link>
        </div>
      )}

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
              <StudentTask key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл байсан`} photos={photoMap.get(h.id) ?? []} />
            ))}
            {g.today.map((h) => (
              <StudentTask key={h.id} h={h} when="өнөөдөр хүртэл" photos={photoMap.get(h.id) ?? []} />
            ))}
          </div>
        </section>
      )}

      {g.upcoming.length > 0 && (
        <section>
          <SectionLabel>Дараа</SectionLabel>
          <div className="space-y-3">
            {g.upcoming.map((h) => (
              <StudentTask key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл`} photos={photoMap.get(h.id) ?? []} />
            ))}
          </div>
        </section>
      )}

      {g.totalCount === 0 && <Empty icon={BookOpen}>Даалгавар алга. Амарч байгаарай 🌿</Empty>}

      {notices.length > 0 && (
        <section>
          <SectionLabel>Зарлал</SectionLabel>
          <div className="space-y-2">
            {notices.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <IconBox icon={Megaphone} tint="шар" />
                  <p className="min-w-0 whitespace-pre-line text-sm text-ink">{a.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Даалгавар байхгүй өдөр ч аппыг нээх шалтгаан болно. */}
      {nextDay && (
        <section>
          <SectionLabel>{nextDay.label} — хичээл</SectionLabel>
          <Card>
            <ol className="space-y-1.5">
              {nextDay.lessons.map((l) => (
                <li key={`${l.dayOfWeek}-${l.period}`} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-ink-faint">
                    {l.period}
                  </span>
                  <span className="font-semibold text-ink">{lessonName(l)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      )}

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

                {/*
                  Андуурч дарсан бол буцаах зам. Багш шалгасны дараа, эсвэл
                  зураг илгээсэн бол гарахгүй — тэр хоёр нь баталгаа.
                */}
                {undoable.has(h.id) && (
                  <form action={undoDoneAction} className="mt-2">
                    <input type="hidden" name="homeworkId" value={h.id} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-ink-faint underline hover:text-accent"
                    >
                      Андуурч дарсан — буцаах
                    </button>
                  </form>
                )}
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
