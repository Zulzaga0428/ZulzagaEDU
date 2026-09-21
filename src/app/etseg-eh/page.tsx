import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { childHomework, myChildren } from "@/server/homework/service";
import type { StudentHomeworkRow } from "@/server/homework/service";
import { groupByDue, parentHeadline } from "@/server/homework/grouping";
import { formatDueUb } from "@/server/homework/time";

export const dynamic = "force-dynamic";

/**
 * Эцэг эхийн нүүр — «оройн 30 секунд».
 *
 * Бүх даалгаврыг нэг жагсаалтаар цутгахгүй. Дээд талд нэг өгүүлбэр, дараа
 * нь анхаарах зүйл, дараа нь хийх зүйл, доор нь багшийн тэмдэглэл.
 */

function Item({ h }: { h: StudentHomeworkRow }) {
  return (
    <li className="px-4 py-3">
      <p className="truncate font-bold text-ink">{h.title}</p>
      <p className="text-xs text-ink-faint">
        {h.subject ?? "Хичээл"} · {formatDueUb(h.dueAt)} хүртэл
      </p>
    </li>
  );
}

function Group({
  label,
  items,
  tone = "энгийн",
}: {
  label: string;
  items: StudentHomeworkRow[];
  tone?: "энгийн" | "анхаар";
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-4">
      <h3
        className={`text-xs font-bold uppercase tracking-wider ${
          tone === "анхаар" ? "text-accent" : "text-ink-faint"
        }`}
      >
        {label} · {items.length}
      </h3>
      <ul
        className={`mt-1.5 divide-y divide-line overflow-hidden rounded-2xl border bg-surface ${
          tone === "анхаар" ? "border-warn-line" : "border-line"
        }`}
      >
        {items.map((h) => (
          <Item key={h.id} h={h} />
        ))}
      </ul>
    </section>
  );
}

export default async function ParentHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "PARENT") redirect("/");

  // Эцэг эх ангид гишүүн биш — зөвхөн батлагдсан хүүхдээрээ дамжина.
  const children = await myChildren(viewer);
  const cards = await Promise.all(
    children.map(async (child) => {
      const items = await childHomework(viewer, child.id);
      return { child, groups: groupByDue(items) };
    }),
  );

  return (
    <AppShell viewer={viewer}>
      {cards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Холбогдсон хүүхэд алга байна. Багшаас урилга авна уу.
        </p>
      ) : (
        cards.map(({ child, groups }) => {
          const head = parentHeadline(groups);
          return (
            <section key={child.id} className="mb-10">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-extrabold text-navy">{child.name}</h2>
                <span className="shrink-0 text-xs text-ink-faint">
                  {child.className ? `${child.className} анги` : "Ангид ороогүй"}
                </span>
              </div>

              {/* Ганц өгүүлбэр. Эцэг эх үүнийг уншаад цааш үзэх эсэхээ шийднэ. */}
              <p
                className={`mt-2 rounded-2xl px-5 py-4 text-center text-lg font-extrabold ${
                  head.tone === "анхаар"
                    ? "border border-warn-line bg-warn-bg text-ink"
                    : "bg-surface-soft text-ink"
                }`}
              >
                {head.text}
              </p>

              {groups.totalCount > 0 && (
                <p className="mt-1.5 text-center text-xs text-ink-faint">
                  Нийт {groups.totalCount} даалгавраас {groups.doneCount} нь хийгдсэн
                </p>
              )}

              <Group label="Хугацаа өнгөрсөн" items={groups.overdue} tone="анхаар" />
              <Group label="Өнөөдөр" items={groups.today} tone="анхаар" />
              <Group label="Дараа" items={groups.upcoming} />

              {groups.notes.length > 0 && (
                <section className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                    Багшийн тэмдэглэл
                  </h3>
                  <ul className="mt-1.5 space-y-2">
                    {groups.notes.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-2xl border border-line bg-surface px-4 py-3"
                      >
                        <p className="text-xs text-ink-faint">{h.title}</p>
                        <p className="mt-0.5 text-sm font-semibold text-ink">{h.teacherNote}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </section>
          );
        })
      )}
    </AppShell>
  );
}
