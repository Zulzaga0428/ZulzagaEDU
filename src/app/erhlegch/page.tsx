import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes, memberships } from "@/server/db/schema";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function ManagerHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "ACADEMIC_MANAGER") redirect("/");

  const [counts] = await db
    .select({
      teachers: sql<number>`count(*) filter (where ${memberships.role} = 'TEACHER')::int`,
      parents: sql<number>`count(*) filter (where ${memberships.role} = 'PARENT')::int`,
      students: sql<number>`count(*) filter (where ${memberships.role} = 'STUDENT')::int`,
    })
    .from(memberships)
    .where(and(eq(memberships.schoolId, viewer.schoolId), eq(memberships.status, "ACTIVE")));

  const classRows = await db
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
    .where(and(eq(classes.schoolId, viewer.schoolId), isNull(classes.archivedAt)))
    .orderBy(classes.grade, classes.name);

  const stats = [
    { label: "Багш", value: counts?.teachers ?? 0 },
    { label: "Сурагч", value: counts?.students ?? 0 },
    { label: "Эцэг эх", value: counts?.parents ?? 0 },
  ];

  return (
    <AppShell viewer={viewer} wide>
      <h1 className="text-2xl font-extrabold text-ink">Сургуулийн тойм</h1>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface px-4 py-4">
            <dt className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              {s.label}
            </dt>
            <dd className="mt-1 text-3xl font-extrabold text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-ink-faint">Ангиуд</h2>
      {classRows.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line px-4 py-8 text-center text-ink-soft">
          Анги үүсгээгүй байна.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {classRows.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span className="font-bold text-ink">{c.name}</span>
              <span className="text-sm text-ink-faint">{c.studentCount} сурагч</span>
            </li>
          ))}
        </ul>
      )}

      {/*
        ⚠️ Энд даалгаврын АГУУЛГА хэзээ ч гарахгүй — зөвхөн тоо.
        Самбар нь багш хянах хэрэгсэл болбол багш нар системийг дотроос нь
        үхүүлнэ (docs/PERMISSIONS.md).
      */}
    </AppShell>
  );
}
