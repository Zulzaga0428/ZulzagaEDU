import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes, lessons, subjects } from "@/server/db/schema";
import {
  AccessError,
  childrenOf,
  teachesClass,
  type Viewer,
} from "@/server/auth/access";

/**
 * Хичээлийн хуваарь.
 *
 * Долоо хоногийн нэг хүснэгт: өдөр × дараалал. Огноо, улирал, ээлж байхгүй.
 * Багш улиралд нэг удаа бөглөнө — өдөр бүрийн ажил биш, тиймээс «багшид ажил
 * нэмэхгүй» гэсэн дүрэм зөрчигдөхгүй.
 */

export const DAYS = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"] as const;
export const MAX_PERIODS = 7;

export type LessonCell = {
  dayOfWeek: number;
  period: number;
  subjectId: string | null;
  subjectName: string | null;
  customName: string | null;
};

/** Тухайн ангийн бүх хичээл. Харах эрхийг дуудагч талд шалгана. */
async function readClassLessons(classId: string): Promise<LessonCell[]> {
  const rows = await db
    .select({
      dayOfWeek: lessons.dayOfWeek,
      period: lessons.period,
      subjectId: lessons.subjectId,
      subjectName: subjects.name,
      customName: lessons.customName,
    })
    .from(lessons)
    .leftJoin(subjects, eq(subjects.id, lessons.subjectId))
    .where(eq(lessons.classId, classId))
    .orderBy(asc(lessons.dayOfWeek), asc(lessons.period));

  return rows;
}

export async function teacherWeek(viewer: Viewer, classId: string): Promise<LessonCell[]> {
  if (!(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }
  return readClassLessons(classId);
}

/**
 * Хуваарийг бүхэлд нь хадгална.
 *
 * Хэсэгчлэн засахгүй — багш хүснэгтийг бүтнээр нь илгээж, бид хуучныг нь
 * сольж тавина. Ингэснээр «хассан нүд» гэсэн тусдаа ойлголт хэрэггүй болно.
 */
export async function saveWeek(
  viewer: Viewer,
  classId: string,
  cells: { dayOfWeek: number; period: number; subjectId: string | null }[],
): Promise<number> {
  if (viewer.role !== "TEACHER" && viewer.role !== "ACADEMIC_MANAGER") {
    throw new AccessError("ЭРХГҮЙ");
  }
  if (viewer.role === "TEACHER" && !(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  const valid = cells.filter(
    (c) =>
      c.subjectId &&
      Number.isInteger(c.dayOfWeek) &&
      c.dayOfWeek >= 1 &&
      c.dayOfWeek <= DAYS.length &&
      Number.isInteger(c.period) &&
      c.period >= 1 &&
      c.period <= MAX_PERIODS,
  );

  // Өөр сургуулийн хичээл шургуулахаас сэргийлнэ.
  const ids = [...new Set(valid.map((c) => c.subjectId as string))];
  const allowed =
    ids.length === 0
      ? []
      : await db
          .select({ id: subjects.id })
          .from(subjects)
          .where(and(inArray(subjects.id, ids), eq(subjects.schoolId, viewer.schoolId)));
  const allowedIds = new Set(allowed.map((a) => a.id));
  const clean = valid.filter((c) => allowedIds.has(c.subjectId as string));

  await db.transaction(async (tx) => {
    await tx.delete(lessons).where(eq(lessons.classId, classId));
    if (clean.length > 0) {
      await tx.insert(lessons).values(
        clean.map((c) => ({
          schoolId: viewer.schoolId,
          classId,
          dayOfWeek: c.dayOfWeek,
          period: c.period,
          subjectId: c.subjectId,
          updatedBy: viewer.userId,
        })),
      );
    }
  });

  return clean.length;
}

/** Сурагчийн ангийн хуваарь. */
export async function myWeek(viewer: Viewer): Promise<LessonCell[]> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");

  const [row] = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, viewer.userId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);

  return row ? readClassLessons(row.classId) : [];
}

/** Эцэг эх хүүхдийнхээ хуваарийг харна — асран хамгаалагч мөн эсэхийг шалгана. */
export async function childWeek(viewer: Viewer, childUserId: string): Promise<LessonCell[]> {
  if (viewer.role !== "PARENT") throw new AccessError("ЭРХГҮЙ");
  const children = await childrenOf(viewer.userId);
  if (!children.includes(childUserId)) throw new AccessError("ЭРХГҮЙ");

  const [row] = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, childUserId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);

  return row ? readClassLessons(row.classId) : [];
}

/**
 * Дараагийн хичээлтэй өдөр.
 *
 * Оройн 8 цагт эцэг эхийн асуулт «маргааш ямар хичээлтэй вэ» байдаг тул
 * өнөөдрийнхийг биш, **дараагийнхийг** харуулна. Бямба гарагт Даваа руу
 * эргэлдэнэ.
 */
export function nextSchoolDay(
  all: LessonCell[],
  now: Date = new Date(),
): { dayOfWeek: number; label: string; lessons: LessonCell[] } | null {
  if (all.length === 0) return null;

  // Улаанбаатарын өдрийг олно (UTC+8). JS: 0 = Ням.
  const ub = new Date(now.getTime() + 8 * 3600_000);
  const jsDay = ub.getUTCDay();
  const today = jsDay === 0 ? 7 : jsDay; // 1 = Даваа … 7 = Ням

  for (let step = 1; step <= 7; step++) {
    const day = ((today - 1 + step) % 7) + 1;
    if (day > DAYS.length) continue;
    const forDay = all.filter((l) => l.dayOfWeek === day);
    if (forDay.length > 0) {
      const label = step === 1 ? "Маргааш" : DAYS[day - 1];
      return { dayOfWeek: day, label, lessons: forDay };
    }
  }
  return null;
}

export function lessonName(cell: LessonCell): string {
  return cell.subjectName ?? cell.customName ?? "—";
}
