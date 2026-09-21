import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { homeworkRoster } from "@/server/homework/service";
import { formatDueUb } from "@/server/homework/time";
import { checkAllDoneAction, checkSubmissionAction, deleteHomeworkAction } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * «Хэн хийсэн бэ» — багшийг системд үлдээдэг дэлгэц.
 *
 * Гурван бүлэг, энэ дарааллаар:
 *   1. Хийгээгүй   — багшийн хайж байгаа зүйл
 *   2. Шалгах      — сурагч хийсэн, багш хараахан хараагүй
 *   3. Шалгасан    — дууссан
 *
 * Messenger группээс ялгарах гол зүйл нь энэ: хэн ч тоолох шаардлагагүй.
 */
export default async function HomeworkRosterPage({ params }: PageProps<"/bagsh/daalgavar/[id]">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const { id } = await params;
  const { title, dueAt, rows } = await homeworkRoster(viewer, id);

  const pending = rows.filter((r) => r.status === "ASSIGNED");
  const toCheck = rows.filter((r) => r.status === "DONE");
  const checked = rows.filter((r) => r.status === "CHECKED");

  return (
    <AppShell viewer={viewer}>
      <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-navy">{title}</h1>
      <p className="mt-1 text-sm text-ink-faint">{formatDueUb(dueAt)} хүртэл</p>

      <p className="mt-5 rounded-2xl bg-surface-soft px-5 py-4 text-center">
        <span className="text-3xl font-extrabold text-brand">
          {rows.length - pending.length}/{rows.length}
        </span>
        <span className="mt-0.5 block text-sm text-ink-soft">хийсэн</span>
      </p>

      {pending.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Хийгээгүй · {pending.length}
          </h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {pending.map((r) => (
              <li key={r.submissionId} className="px-4 py-3 font-semibold text-ink">
                {r.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {toCheck.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              Шалгах · {toCheck.length}
            </h2>
            {/* 24 удаа дарахгүйн тулд. Ихэнх даалгаврыг багш бөөнд нь хардаг. */}
            <form action={checkAllDoneAction}>
              <input type="hidden" name="homeworkId" value={id} />
              <button
                type="submit"
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-brand-strong"
              >
                Бүгдийг шалгасан
              </button>
            </form>
          </div>

          <ul className="mt-2 space-y-2">
            {toCheck.map((r) => (
              <li
                key={r.submissionId}
                className="rounded-2xl border border-line bg-surface px-4 py-3"
              >
                <p className="font-semibold text-ink">{r.name}</p>
                <form action={checkSubmissionAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="homeworkId" value={id} />
                  <input type="hidden" name="submissionId" value={r.submissionId} />
                  <input
                    name="note"
                    maxLength={300}
                    placeholder="Тэмдэглэл — заавал биш"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-strong"
                  >
                    Шалгасан
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {checked.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Шалгасан · {checked.length}
          </h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {checked.map((r) => (
              <li key={r.submissionId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">{r.name}</span>
                  <span aria-label="шалгасан" className="shrink-0 text-dot-parent">
                    ✓
                  </span>
                </div>
                {r.teacherNote && (
                  <p className="mt-1 text-sm text-ink-soft">{r.teacherNote}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length === 0 && (
        <p className="mt-7 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Энэ ангид сурагч алга байна.
        </p>
      )}

      <form action={deleteHomeworkAction} className="mt-10 border-t border-line pt-5">
        <input type="hidden" name="homeworkId" value={id} />
        <button
          type="submit"
          className="w-full rounded-xl border border-line px-4 py-3 text-sm font-bold text-ink-soft hover:border-accent hover:text-accent"
        >
          Даалгаврыг устгах
        </button>
      </form>
    </AppShell>
  );
}
