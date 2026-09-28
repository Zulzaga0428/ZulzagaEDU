import { redirect } from "next/navigation";
import { CalendarClock, CircleCheck, Clock, Megaphone, MessageSquare, MessageSquareText, TriangleAlert, Users } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { startThreadAction } from "@/app/yaria/actions";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, FeatureCard, IconBox, Row, SectionLabel } from "@/components/ui";
import { childHomework, myChildren } from "@/server/homework/service";
import type { StudentHomeworkRow } from "@/server/homework/service";
import { groupByDue, parentHeadline } from "@/server/homework/grouping";
import { formatDueUb } from "@/server/homework/time";
import { childWeek, lessonName, nextSchoolDay } from "@/server/schedule/service";
import { parentAnnouncements } from "@/server/announce/service";
import { myPendingLinks } from "@/server/invite/service";

export const dynamic = "force-dynamic";

/**
 * Эцэг эхийн нүүр — «оройн 30 секунд».
 *
 * Хүүхэд бүрд нэг өгүүлбэр, дараа нь анхаарах зүйл, дараа нь хийх зүйл,
 * доор нь багшийн тэмдэглэл. Бүх даалгаврыг нэг жагсаалтаар цутгахгүй.
 */
function Group({
  label,
  items,
  icon,
  tint,
}: {
  label: string;
  items: StudentHomeworkRow[];
  icon: typeof CalendarClock;
  tint: "шар" | "цэнхэр" | "саарал";
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionLabel>
        {label} · {items.length}
      </SectionLabel>
      <div className="space-y-2">
        {items.map((h) => (
          <div key={h.id}>
            <Row
              icon={icon}
              tint={tint}
              title={h.title}
              subtitle={`${h.subject ?? "Хичээл"} · ${formatDueUb(h.dueAt)} хүртэл`}
            />
            {/*
              Эцэг эхийн гол асуулт: «өнөөдөр яг юу өгсөн бэ». Самбарын зураг
              байвал хүүхдийн хуулбарыг тайлах шаардлагагүй.
            */}
            {h.boardPhotos.map((id) => (
              <a
                key={id}
                href={`/api/file/${id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/file/${id}`}
                  alt="Багшийн самбар"
                  className="w-full rounded-2xl border border-line object-contain"
                />
              </a>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ParentHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "PARENT") redirect("/");

  // Эцэг эх ангид гишүүн биш — зөвхөн батлагдсан хүүхдээрээ дамжина.
  const children = await myChildren(viewer);
  // Батлагдаагүй хүсэлт — хоосон дэлгэцийг зөв тайлбарлахад хэрэгтэй.
  const pending = children.length === 0 ? await myPendingLinks(viewer) : [];
  const cards = await Promise.all(
    children.map(async (child) => {
      const [items, week] = await Promise.all([
        childHomework(viewer, child.id),
        childWeek(viewer, child.id),
      ]);
      return { child, groups: groupByDue(items), nextDay: nextSchoolDay(week) };
    }),
  );

  const attention = cards.filter((c) => parentHeadline(c.groups).tone === "анхаар").length;
  const notices = await parentAnnouncements(viewer, 3);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Эцэг эхийн орон зай"
      /*
        Хараахан юу ч харж чадахгүй эцэг эхэд «бүх зүйл хэвийн» гэж хэлэх нь
        доорх хүлээлтийн картаа зөрчинө.
      */
      title={
        pending.length > 0
          ? "Хүлээж байна"
          : attention > 0
            ? "Өнөөдөр анхаарах зүйл байна"
            : "Бүх зүйл хэвийн"
      }
      subtitle={
        pending.length > 0
          ? "Багш баталмагц эхэлнэ."
          : "Хүүхдийнхээ өнөөдрийг 30 секундэд."
      }
    >
      {notices.length > 0 && (
        <section>
          <SectionLabel>Зарлал</SectionLabel>
          <div className="space-y-2">
            {notices.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <IconBox icon={Megaphone} tint="шар" />
                  <div className="min-w-0">
                    <p className="whitespace-pre-line text-sm text-ink">{a.body}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {a.className ?? "Сургууль даяар"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {cards.length === 0 && pending.length > 0 ? (
        /*
          Урилгаар нэгдсэн ч багш батлаагүй байгаа эцэг эх. Өмнө нь «багшаас
          урилга авна уу» гэж харуулдаг байсан нь буруу: тэр урилгаа аль
          хэдийн ашигласан. Дахин уншуулбал «аль хэдийн» гэсэн алдаа авна.
        */
        <Card className="border-warn-line bg-warn-bg">
          <div className="flex items-start gap-3">
            <IconBox icon={Clock} tint="шар" />
            <div className="min-w-0">
              <p className="font-extrabold text-ink">Багшийн баталгааг хүлээж байна</p>
              <p className="mt-1 text-sm text-ink-soft">
                {pending.map((p) => p.studentName).join(", ")} — багш танийг
                баталгаажуулмагц даалгавар нь энд харагдана.
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                Энэ алхам нь хүүхдийн мэдээллийг хамгаалахад зориулагдсан. Удвал
                багшдаа сануулаарай.
              </p>
            </div>
          </div>
        </Card>
      ) : cards.length === 0 ? (
        <Empty icon={Users}>Холбогдсон хүүхэд алга байна. Багшаас урилга авна уу.</Empty>
      ) : (
        cards.map(({ child, groups, nextDay }) => {
          const head = parentHeadline(groups);
          return (
            <section key={child.id} className="space-y-4">
              <FeatureCard
                icon={head.tone === "анхаар" ? TriangleAlert : CircleCheck}
                tint={head.tone === "анхаар" ? "шар" : "ногоон"}
                eyebrow={child.className ? `${child.className} анги` : "Ангид ороогүй"}
                title={child.name}
              >
                {head.text}
                {groups.totalCount > 0 && (
                  <span className="mt-1 block text-xs text-ink-faint">
                    Нийт {groups.totalCount} даалгавраас {groups.doneCount} нь хийгдсэн
                  </span>
                )}
              </FeatureCard>

              {/*
                Багштай холбогдох зам (`docs/DECISIONS.md` §17). Хүүхэд тус
                бүрд тусдаа — «аль хүүхдийн тухай яриад байна» гэж асуухгүй.
              */}
              <form action={startThreadAction}>
                <input type="hidden" name="studentUserId" value={child.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand"
                >
                  <IconBox icon={MessageSquare} tint="цэнхэр" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">Багштай ярих</span>
                    <span className="block text-xs text-ink-faint">
                      {child.name}-ийн тухай
                    </span>
                  </span>
                  <span className="shrink-0 text-ink-faint">›</span>
                </button>
              </form>

              <Group label="Хугацаа өнгөрсөн" items={groups.overdue} icon={TriangleAlert} tint="шар" />
              <Group label="Өнөөдөр" items={groups.today} icon={CalendarClock} tint="цэнхэр" />
              <Group label="Дараа" items={groups.upcoming} icon={CalendarClock} tint="саарал" />

              {/* «Маргааш ямар хичээлтэй вэ» — оройн гол асуулт. */}
              {nextDay && (
                <section>
                  <SectionLabel>{nextDay.label} — хичээл</SectionLabel>
                  <Card>
                    <ol className="space-y-1.5">
                      {nextDay.lessons.map((l) => (
                        <li
                          key={`${l.dayOfWeek}-${l.period}`}
                          className="flex items-center gap-3"
                        >
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

              {groups.notes.length > 0 && (
                <section>
                  <SectionLabel>Багшийн тэмдэглэл</SectionLabel>
                  <div className="space-y-2">
                    {groups.notes.map((h) => (
                      <Card key={h.id}>
                        <div className="flex items-start gap-3">
                          <IconBox icon={MessageSquareText} tint="ногоон" />
                          <div className="min-w-0">
                            <p className="text-xs text-ink-faint">{h.title}</p>
                            <p className="mt-0.5 text-sm font-semibold text-ink">
                              {h.teacherNote}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </section>
          );
        })
      )}
    </AppShell>
  );
}
