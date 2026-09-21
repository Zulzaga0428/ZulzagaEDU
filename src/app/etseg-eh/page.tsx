import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { childHomework, myChildren } from "@/server/homework/service";
import { formatDueUb, isOverdue } from "@/server/homework/time";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "PARENT") redirect("/");

  // Хүүхэд бүрийн даалгаврыг тусад нь — эцэг эх ангид гишүүн биш, зөвхөн
  // өөрийн хүүхдээр дамжиж харна.
  const children = await myChildren(viewer);
  const withHomework = await Promise.all(
    children.map(async (c) => ({ child: c, items: await childHomework(viewer, c.id) })),
  );

  return (
    <AppShell viewer={viewer}>
      <h1 className="text-2xl font-extrabold text-navy">Хүүхдүүд</h1>

      {withHomework.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Холбогдсон хүүхэд алга байна. Багшаас урилга авна уу.
        </p>
      ) : (
        withHomework.map(({ child, items }) => {
          const todo = items.filter((h) => h.status === "ASSIGNED");
          const done = items.length - todo.length;

          return (
            <section key={child.id} className="mt-7">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-extrabold text-ink">{child.name}</h2>
                <span className="shrink-0 text-xs text-ink-faint">
                  {child.className ? `${child.className} анги` : "Ангид ороогүй"}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
                  Одоогоор даалгавар алга.
                </p>
              ) : (
                <>
                  <p className="mt-2 rounded-2xl bg-surface-soft px-5 py-3 text-center font-extrabold text-ink">
                    {items.length} даалгавраас <span className="text-brand">{done}</span> нь
                    хийгдсэн
                  </p>

                  <ul className="mt-3 space-y-2">
                    {items.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink">{h.title}</p>
                          <p className="text-xs text-ink-faint">
                            {h.subject ?? "Хичээл"} · {formatDueUb(h.dueAt)} хүртэл
                            {h.status === "ASSIGNED" && isOverdue(h.dueAt) && (
                              <span className="text-accent"> · хугацаа өнгөрсөн</span>
                            )}
                          </p>
                          {h.teacherNote && (
                            <p className="mt-1.5 text-sm text-ink-soft">
                              Багш: {h.teacherNote}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-xs font-bold ${
                            h.status === "ASSIGNED" ? "text-ink-faint" : "text-dot-parent"
                          }`}
                        >
                          {h.status === "ASSIGNED"
                            ? "хийгээгүй"
                            : h.status === "CHECKED"
                              ? "багш шалгасан ✓"
                              : "хийсэн ✓"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          );
        })
      )}
    </AppShell>
  );
}
