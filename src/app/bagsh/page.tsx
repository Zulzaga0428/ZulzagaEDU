import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { listClassHomework, myClasses } from "@/server/homework/service";
import { formatDueUb, isOverdue } from "@/server/homework/time";

export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const classList = await myClasses(viewer);
  const perClass = await Promise.all(
    classList.map(async (c) => ({ klass: c, items: await listClassHomework(viewer, c.id) })),
  );

  return (
    <AppShell viewer={viewer}>
      <h1 className="text-2xl font-extrabold text-navy">Сайн байна уу, багш аа</h1>

      {/*
        Багшийн өдөр бүр хийдэг ганц үйлдэл. Дэлгэцийн хамгийн том, хамгийн
        дээд зүйл байх ёстой — дунд нь жижиг чип болж суух ёсгүй.
      */}
      {classList.length > 0 && (
        <Link
          href="/bagsh/daalgavar/shine"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-5 text-lg font-extrabold text-brand-ink shadow-[0_10px_24px_rgba(43,133,246,0.28)] hover:bg-brand-strong"
        >
          ➕ Даалгавар өгөх
        </Link>
      )}

      {perClass.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Танд хариуцсан анги алга байна.
        </p>
      ) : (
        perClass.map(({ klass, items }) => (
          <section key={klass.id} className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-extrabold text-ink">{klass.name} анги</h2>
              <span className="text-xs text-ink-faint">{klass.grade}-р анги</span>
            </div>

            {items.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
                Одоогоор даалгавар өгөөгүй байна.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {items.map((h) => {
                  const pct = h.total === 0 ? 0 : Math.round((h.done / h.total) * 100);
                  const late = isOverdue(h.dueAt) && h.done < h.total;
                  return (
                    <li key={h.id}>
                      <Link
                        href={`/bagsh/daalgavar/${h.id}`}
                        className="block rounded-2xl border border-line bg-surface px-4 py-4 hover:border-brand"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-ink">{h.title}</p>
                            <p className="text-xs text-ink-faint">
                              {h.subject ?? "Хичээл заагаагүй"} · {formatDueUb(h.dueAt)}
                              {late && <span className="text-accent"> · хугацаа өнгөрсөн</span>}
                            </p>
                          </div>
                          <span className="shrink-0 text-lg font-extrabold text-brand">
                            {h.done}/{h.total}
                          </span>
                        </div>

                        <div
                          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-soft"
                          role="img"
                          aria-label={`${h.total} сурагчийн ${h.done} нь хийсэн`}
                        >
                          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))
      )}
    </AppShell>
  );
}
