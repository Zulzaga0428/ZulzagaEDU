import Link from "next/link";
import { redirect } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, SectionLabel } from "@/components/ui";
import { StudentTask } from "@/components/student-task";
import { myHomework } from "@/server/homework/service";
import { groupByDue } from "@/server/homework/grouping";
import { formatDueUb } from "@/server/homework/time";
import { myAttachments } from "@/server/files/storage";
import { undoDoneAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Сурагчийн БҮХ даалгавар.
 *
 * Нүүрнээс ялгаатай нь: нүүр нь «өнөөдөр юу хийх вэ» гэдгийг хэлнэ, энэ нь
 * бүх түүхийг харуулна — хийсэн, багш шалгасан, тэмдэглэл бичсэн бүгдийг.
 *
 * Хүүхэд «би өнгөрсөн долоо хоногт юу хийсэн бэ», «багш юу гэж бичсэн бэ»
 * гэдгийг энд хардаг.
 */
export default async function StudentHomeworkPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect("/");

  const items = await myHomework(viewer);
  const g = groupByDue(items);
  const pending = [...g.overdue, ...g.today, ...g.upcoming];
  const finished = items.filter((h) => h.status !== "ASSIGNED");

  const photoMap = new Map<string, string[]>(
    await Promise.all(
      pending.map(async (h) => [h.id, await myAttachments(viewer, h.id)] as [string, string[]]),
    ),
  );

  // Буцаах товч зөвхөн зураггүй ажилд — зураг нь хийсний баталгаа.
  const undoable = new Set(
    (
      await Promise.all(
        finished
          .filter((h) => h.status === "DONE")
          .map(async (h) => ((await myAttachments(viewer, h.id)).length === 0 ? h.id : null)),
      )
    ).filter((id): id is string => id !== null),
  );

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Даалгавар"
      title="Миний даалгавар"
      subtitle={`${items.length} даалгавраас ${g.doneCount} нь хийгдсэн.`}
    >
      <Link href="/suragch" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      {items.length === 0 && (
        <Empty icon={NotebookPen}>Одоогоор даалгавар алга. Амарч байгаарай 🌿</Empty>
      )}

      {pending.length > 0 && (
        <section>
          <SectionLabel>Хийх ёстой · {pending.length}</SectionLabel>
          <div className="space-y-3">
            {pending.map((h) => (
              <StudentTask
                key={h.id}
                h={h}
                when={formatDueUb(h.dueAt)}
                photos={photoMap.get(h.id) ?? []}
              />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <SectionLabel>Хийсэн · {finished.length}</SectionLabel>
          <div className="space-y-2">
            {finished.map((h) => (
              <Card key={h.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-soft">{h.title}</p>
                    <p className="text-xs text-ink-faint">
                      {h.subject ?? "Хичээл"} · {formatDueUb(h.dueAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-dot-parent">
                    {h.status === "CHECKED" ? "Багш шалгасан ✓" : "✓"}
                  </span>
                </div>

                {h.teacherNote && (
                  <p className="mt-2 rounded-2xl bg-surface-soft px-4 py-3 text-sm text-ink">
                    Багш: {h.teacherNote}
                  </p>
                )}

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
              </Card>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
