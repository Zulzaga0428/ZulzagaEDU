import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { homeworkRoster } from "@/server/homework/service";
import { formatDueUb } from "@/server/homework/time";

export const dynamic = "force-dynamic";

/**
 * «Хэн хийсэн бэ» — багшийг системд үлдээдэг дэлгэц.
 *
 * Хийгээгүй сурагчид ЭХЭНДЭЭ гарна: багшийн хайж байгаа зүйл нь хийсэн хүн
 * биш, хийгээгүй хүн. Messenger группээс ялгарах гол зүйл ч мөн энэ —
 * тоолох шаардлагагүй.
 */
export default async function HomeworkRosterPage({ params }: PageProps<"/bagsh/daalgavar/[id]">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const { id } = await params;
  const { title, dueAt, rows } = await homeworkRoster(viewer, id);

  const pending = rows.filter((r) => r.status === "ASSIGNED");
  const done = rows.filter((r) => r.status !== "ASSIGNED");

  return (
    <AppShell viewer={viewer}>
      <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-navy">{title}</h1>
      <p className="mt-1 text-sm text-ink-faint">{formatDueUb(dueAt)} хүртэл</p>

      <p className="mt-5 rounded-2xl bg-surface-soft px-5 py-4 text-center">
        <span className="text-3xl font-extrabold text-brand">
          {done.length}/{rows.length}
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
              <li key={r.studentUserId} className="px-4 py-3 font-semibold text-ink">
                {r.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <section className="mt-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Хийсэн · {done.length}
          </h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {done.map((r) => (
              <li
                key={r.studentUserId}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="font-semibold text-ink">{r.name}</span>
                <span aria-label="хийсэн" className="text-dot-parent">
                  ✓
                </span>
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
    </AppShell>
  );
}
