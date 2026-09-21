import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes } from "@/server/db/schema";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  // Зөвхөн энэ багшийн заадаг ангиуд, зөвхөн энэ сургуулийнх.
  const myClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      grade: classes.grade,
      studentCount: sql<number>`(
        select count(*)::int from ${classMembers} cm
        where cm.class_id = ${classes.id}
          and cm.role = 'STUDENT' and cm.status = 'ACTIVE'
      )`,
    })
    .from(classes)
    .innerJoin(classMembers, eq(classMembers.classId, classes.id))
    .where(
      and(
        eq(classMembers.userId, viewer.userId),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    );

  return (
    <AppShell viewer={viewer}>
      <h1 className="text-2xl font-extrabold text-ink">Сайн байна уу, багш аа</h1>

      {myClasses.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Танд хариуцсан анги алга байна.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {myClasses.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-line bg-surface px-4 py-4"
            >
              <p className="text-lg font-extrabold text-ink">{c.name} анги</p>
              <p className="text-sm text-ink-faint">
                {c.grade}-р анги · {c.studentCount} сурагч
              </p>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled
        className="mt-6 w-full rounded-2xl bg-brand px-4 py-5 text-lg font-extrabold text-brand-ink opacity-50"
      >
        ➕ Даалгавар өгөх
      </button>
      <p className="mt-2 text-center text-xs text-ink-faint">
        4 дэх долоо хоногт хийгдэнэ
      </p>
    </AppShell>
  );
}
