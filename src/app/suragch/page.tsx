import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes } from "@/server/db/schema";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { myHomework } from "@/server/homework/service";
import { formatDueUb, isOverdue } from "@/server/homework/time";
import { markDoneAction } from "./actions";

export const dynamic = "force-dynamic";

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

  const todo = items.filter((h) => h.status === "ASSIGNED");
  const finished = items.filter((h) => h.status !== "ASSIGNED");

  return (
    <AppShell viewer={viewer}>
      <h1 className="text-2xl font-extrabold text-navy">Сайн уу!</h1>
      <p className="mt-1 text-ink-soft">{myClass?.name ? `${myClass.name} анги` : "Ангид ороогүй"}</p>

      {/* Хүүхдэд хувь биш, тоо: «3-аас 1 нь хийгдсэн». */}
      {items.length > 0 && (
        <p className="mt-5 rounded-2xl bg-surface-soft px-5 py-4 text-center text-lg font-extrabold text-ink">
          {items.length} даалгавраас{" "}
          <span className="text-brand">{finished.length}</span> нь хийгдсэн
        </p>
      )}

      <section className="mt-7">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
          Хийх зүйл
        </h2>

        {todo.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-ink-soft">
            Даалгавар алга. Амарч байгаарай 🌿
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {todo.map((h) => (
              <li key={h.id} className="rounded-2xl border border-line bg-surface px-4 py-4">
                <p className="text-lg font-extrabold text-ink">{h.title}</p>
                <p className="text-xs text-ink-faint">
                  {h.subject ?? "Хичээл"} · {formatDueUb(h.dueAt)} хүртэл
                  {isOverdue(h.dueAt) && <span className="text-accent"> · хугацаа өнгөрсөн</span>}
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
            ))}
          </ul>
        )}
      </section>

      {finished.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Хийсэн
          </h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {finished.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate font-semibold text-ink-soft">{h.title}</span>
                <span aria-label="хийсэн" className="shrink-0 text-dot-parent">
                  ✓
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
