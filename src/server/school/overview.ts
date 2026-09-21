import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { classes, homework, homeworkSubmissions, memberships } from "@/server/db/schema";
import { AccessError, type Viewer } from "@/server/auth/access";

/**
 * Эрхлэгчийн тойм.
 *
 * ⛔ ЭНД ДААЛГАВРЫН АГУУЛГА ХЭЗЭЭ Ч БУЦААХГҮЙ. Зөвхөн тоо.
 *
 * Шалтгаан нь техникийн биш. Эрхлэгч даалгавар бүрийг уншиж чаддаг болвол
 * энэ самбар багш хянах хэрэгсэл болж хувирна, тэгвэл багш нар системийг
 * дотроос нь үхүүлнэ (`docs/PERMISSIONS.md`). Түүнд хэрэгтэй нь «аль ангид
 * дэмжлэг хэрэгтэй вэ» гэдэг, «Сарантуяа юу бичсэн бэ» гэдэг биш.
 *
 * Мөн нэршил чухал: «идэвхгүй багш» биш **«дэмжлэг хэрэгтэй анги»**.
 */

const WEEK_DAYS = 7;

export type ClassActivity = {
  id: string;
  name: string;
  grade: number;
  students: number;
  /** Сүүлийн 7 хоногт өгсөн даалгаврын ТОО. */
  homeworkThisWeek: number;
  /** Тэдгээрийн гүйцэтгэл, хувиар. Даалгавар байхгүй бол null. */
  completion: number | null;
};

export type SchoolOverview = {
  teachers: number;
  students: number;
  parents: number;
  homeworkThisWeek: number;
  classes: ClassActivity[];
  /** Энэ долоо хоногт даалгавар өгөөгүй ангиуд. */
  needsSupport: ClassActivity[];
};

export async function schoolOverview(viewer: Viewer): Promise<SchoolOverview> {
  if (viewer.role !== "ACADEMIC_MANAGER") throw new AccessError("ЭРХГҮЙ");

  const since = new Date(Date.now() - WEEK_DAYS * 24 * 3600 * 1000);

  const [counts] = await db
    .select({
      teachers: sql<number>`count(*) filter (where ${memberships.role} = 'TEACHER')::int`,
      parents: sql<number>`count(*) filter (where ${memberships.role} = 'PARENT')::int`,
      students: sql<number>`count(*) filter (where ${memberships.role} = 'STUDENT')::int`,
    })
    .from(memberships)
    .where(and(eq(memberships.schoolId, viewer.schoolId), eq(memberships.status, "ACTIVE")));

  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      grade: classes.grade,
      students: sql<number>`(
        select count(*)::int from class_members cm
        where cm.class_id = classes.id
          and cm.role = 'STUDENT' and cm.status = 'ACTIVE'
      )`,
      homeworkThisWeek: sql<number>`(
        select count(*)::int from ${homework} h
        where h.class_id = classes.id and h.created_at >= ${since}
      )`,
      assigned: sql<number>`(
        select count(*)::int from ${homeworkSubmissions} s
        join ${homework} h on h.id = s.homework_id
        where h.class_id = classes.id and h.created_at >= ${since}
      )`,
      completed: sql<number>`(
        select count(*)::int from ${homeworkSubmissions} s
        join ${homework} h on h.id = s.homework_id
        where h.class_id = classes.id and h.created_at >= ${since}
          and s.status <> 'ASSIGNED'
      )`,
    })
    .from(classes)
    .where(and(eq(classes.schoolId, viewer.schoolId), isNull(classes.archivedAt)))
    .orderBy(classes.grade, classes.name);

  const classList: ClassActivity[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    grade: r.grade,
    students: r.students,
    homeworkThisWeek: r.homeworkThisWeek,
    completion: r.assigned === 0 ? null : Math.round((r.completed / r.assigned) * 100),
  }));

  return {
    teachers: counts?.teachers ?? 0,
    students: counts?.students ?? 0,
    parents: counts?.parents ?? 0,
    homeworkThisWeek: classList.reduce((n, c) => n + c.homeworkThisWeek, 0),
    classes: classList,
    // Сурагчтай атлаа энэ долоо хоногт даалгавар аваагүй анги.
    needsSupport: classList.filter((c) => c.students > 0 && c.homeworkThisWeek === 0),
  };
}
