import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BookOpen, Calculator, Megaphone, NotebookPen, PartyPopper, Sparkles, Star } from "lucide-react";
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
import { lessonName, myWeek, nextSchoolDay } from "@/server/schedule/service";
import { myAnnouncements } from "@/server/announce/service";
import { markDoneAction, undoDoneAction } from "./actions";
import { PhotoUpload } from "@/components/photo-upload";
import { myAttachments } from "@/server/files/storage";
import { myPoints, pointsEnabled } from "@/server/points/service";

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

function Task({
  h,
  when,
  photos,
}: {
  h: StudentHomeworkRow;
  when: string;
  photos: string[];
}) {
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

      {/*
        Самбарын зураг — ЭНЭ Л даалгавар. Дүрсийг жижигрүүлж таслахгүй:
        уншиж чадахгүй бол утга алга. Дарвал бүтэн хэмжээгээр нээнэ.
      */}
      {h.boardPhotos.length > 0 && (
        <div className="mt-3 space-y-2">
          {h.boardPhotos.map((id) => (
            <a key={id} href={`/api/file/${id}`} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/file/${id}`}
                alt="Багшийн самбар"
                className="w-full rounded-2xl border border-line object-contain"
              />
            </a>
          ))}
        </div>
      )}

      {h.description && (
        <p className="mt-3 whitespace-pre-line rounded-2xl bg-surface-soft px-4 py-3 text-sm text-ink-soft">
          {h.description}
        </p>
      )}

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={`/api/file/${id}`}
              alt="Илгээсэн зураг"
              className="h-24 w-24 shrink-0 rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      {/* Даалгавар цаасан дээр хийгддэг — дэлгэц рүү оруулахын оронд зурагдана. */}
      <div className="mt-3">
        <PhotoUpload homeworkId={h.id} />
      </div>

      <form action={markDoneAction} className="mt-2">
        <input type="hidden" name="homeworkId" value={h.id} />
        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Зураггүй хийчихлээ
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

  const nextDay = nextSchoolDay(await myWeek(viewer));
  // Туг унтраалттай бол `null` — карт огт гарахгүй.
  const points = pointsEnabled() ? await myPoints(viewer) : null;
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

      {/*
        Оноо (`docs/DECISIONS.md` §18). Тугаар унтраалттай тул пилотын эхний
        долоо хоногуудад огт гарахгүй — суурь тоог цэвэр авна.
      */}
      {points !== null && (
        <Card className="bg-role-student">
          <div className="flex items-center gap-3">
            <IconBox icon={Star} tint="ягаан" size="том" />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-extrabold text-navy">{points} оноо</p>
              <p className="text-xs text-ink-soft">
                Даалгавраа хийх бүрд цуглана. Зураг илгээвэл илүү.
              </p>
            </div>
          </div>
        </Card>
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
              <Task key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл байсан`} photos={photoMap.get(h.id) ?? []} />
            ))}
            {g.today.map((h) => (
              <Task key={h.id} h={h} when="өнөөдөр хүртэл" photos={photoMap.get(h.id) ?? []} />
            ))}
          </div>
        </section>
      )}

      {g.upcoming.length > 0 && (
        <section>
          <SectionLabel>Дараа</SectionLabel>
          <div className="space-y-3">
            {g.upcoming.map((h) => (
              <Task key={h.id} h={h} when={`${formatDueUb(h.dueAt)} хүртэл`} photos={photoMap.get(h.id) ?? []} />
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
