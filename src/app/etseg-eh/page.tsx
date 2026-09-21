import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes, users } from "@/server/db/schema";
import { childrenOf, getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "PARENT") redirect("/");

  // Эцэг эх ангийг ХҮҮХДЭЭРЭЭ ДАМЖУУЛАН харна — ангид шууд гишүүн биш.
  const childIds = await childrenOf(viewer.userId);

  const children =
    childIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            name: users.name,
            className: classes.name,
            grade: classes.grade,
          })
          .from(users)
          .leftJoin(
            classMembers,
            and(
              eq(classMembers.userId, users.id),
              eq(classMembers.role, "STUDENT"),
              eq(classMembers.status, "ACTIVE"),
            ),
          )
          .leftJoin(
            classes,
            and(eq(classes.id, classMembers.classId), eq(classes.schoolId, viewer.schoolId)),
          )
          .where(inArray(users.id, childIds));

  return (
    <AppShell viewer={viewer}>
      <h1 className="text-2xl font-extrabold text-ink">Хүүхдүүд</h1>

      {children.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Холбогдсон хүүхэд алга байна. Багшаас урилга авна уу.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {children.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-surface px-4 py-4">
              <p className="text-lg font-extrabold text-ink">{c.name}</p>
              <p className="text-sm text-ink-faint">
                {c.className ? `${c.className} анги` : "Ангид ороогүй"}
              </p>
              <p className="mt-3 text-sm text-ink-soft">Өнөөдөр даалгавар алга.</p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
