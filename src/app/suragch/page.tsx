import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes } from "@/server/db/schema";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect("/");

  const [myClass] = await db
    .select({ id: classes.id, name: classes.name, grade: classes.grade })
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
    .limit(1);

  return (
    <AppShell viewer={viewer}>
      <h1 className="text-2xl font-extrabold text-ink">Сайн уу!</h1>
      <p className="mt-1 text-ink-soft">
        {myClass ? `${myClass.name} анги` : "Ангид ороогүй байна"}
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-faint">
          Өнөөдрийн даалгавар
        </h2>
        <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-10 text-center text-ink-soft">
          Даалгавар алга. Амарч байгаарай 🌿
        </p>
      </section>
    </AppShell>
  );
}
