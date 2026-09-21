import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  auditLog,
  classMembers,
  classes,
  homework,
  homeworkSubmissions,
  subjects,
  users,
} from "@/server/db/schema";
import { AccessError, childrenOf, teachesClass, type Viewer } from "@/server/auth/access";

/**
 * Даалгаврын бизнес логик.
 *
 * UI-аас тусдаа байгаагийн учир: хожим утасны апп нэмэхэд эдгээр функцууд
 * хэвээрээ үлдэж, зөвхөн дээрх давхарга солигдоно (`docs/DECISIONS.md` §12).
 *
 * Функц бүр `Viewer`-ийг авч, эрхээ ӨӨРӨӨ шалгана. Дуудагч талд найдахгүй.
 */

export type NewHomework = {
  classId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  dueAt: Date;
};

/**
 * Даалгавар үүсгэж шууд нийтэлнэ.
 *
 * Нийтлэх үед ангийн сурагч бүрд `homework_submissions` мөр үүснэ. Ингэснээр
 * «18 / 24 хийсэн» нь энгийн тоолол, «хэн хийгээгүй» нь энгийн шүүлт болно.
 * Нэг гүйлгээнд хийгдэнэ — хагас нийтлэгдсэн даалгавар үлдэж болохгүй.
 */
export async function createHomework(viewer: Viewer, input: NewHomework): Promise<string> {
  if (viewer.role !== "TEACHER") throw new AccessError("ЭРХГҮЙ");
  if (!(await teachesClass(viewer.userId, input.classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  const title = input.title.trim();
  if (title.length === 0) throw new Error("Гарчиг хоосон байна.");

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(homework)
      .values({
        schoolId: viewer.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        createdBy: viewer.userId,
        title,
        description: input.description?.trim() || null,
        dueAt: input.dueAt,
        publishedAt: new Date(),
      })
      .returning({ id: homework.id });

    const students = await tx
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, input.classId),
          eq(classMembers.role, "STUDENT"),
          eq(classMembers.status, "ACTIVE"),
        ),
      );

    if (students.length > 0) {
      await tx.insert(homeworkSubmissions).values(
        students.map((s) => ({ homeworkId: row.id, studentUserId: s.userId })),
      );
    }

    await tx.insert(auditLog).values({
      schoolId: viewer.schoolId,
      actorUserId: viewer.userId,
      action: "HOMEWORK_PUBLISHED",
      targetType: "homework",
      targetId: row.id,
      meta: { classId: input.classId, students: students.length },
    });

    return row.id;
  });
}

export type HomeworkRow = {
  id: string;
  title: string;
  subject: string | null;
  dueAt: Date;
  total: number;
  done: number;
};

/** Багшийн ангийн даалгаврууд, шинэ нь эхэндээ. */
export async function listClassHomework(
  viewer: Viewer,
  classId: string,
): Promise<HomeworkRow[]> {
  if (!(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  return db
    .select({
      id: homework.id,
      title: homework.title,
      subject: subjects.name,
      dueAt: homework.dueAt,
      total: sql<number>`(
        select count(*)::int from ${homeworkSubmissions} s
        where s.homework_id = ${homework.id}
      )`,
      done: sql<number>`(
        select count(*)::int from ${homeworkSubmissions} s
        where s.homework_id = ${homework.id} and s.status <> 'ASSIGNED'
      )`,
    })
    .from(homework)
    .leftJoin(subjects, eq(subjects.id, homework.subjectId))
    .where(and(eq(homework.classId, classId), eq(homework.schoolId, viewer.schoolId)))
    .orderBy(desc(homework.dueAt));
}

export type SubmissionRow = {
  studentUserId: string;
  name: string;
  status: "ASSIGNED" | "DONE" | "CHECKED";
  markedDoneAt: Date | null;
};

/**
 * Багшийг үлдээдэг дэлгэц: хэн хийсэн, хэн хийгээгүй.
 *
 * Хийгээгүй нь эхэндээ гарна — багшийн хайж байгаа зүйл тэр.
 */
export async function homeworkRoster(
  viewer: Viewer,
  homeworkId: string,
): Promise<{ title: string; dueAt: Date; rows: SubmissionRow[] }> {
  const [hw] = await db
    .select({ id: homework.id, title: homework.title, dueAt: homework.dueAt, classId: homework.classId })
    .from(homework)
    .where(and(eq(homework.id, homeworkId), eq(homework.schoolId, viewer.schoolId)))
    .limit(1);

  // Олдсоны дараа ЗААВАЛ холбоосыг шалгана — id мэдсэн нь эрх биш.
  if (!hw) throw new AccessError("ЭРХГҮЙ");
  if (!(await teachesClass(viewer.userId, hw.classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  const rows = await db
    .select({
      studentUserId: homeworkSubmissions.studentUserId,
      name: users.name,
      status: homeworkSubmissions.status,
      markedDoneAt: homeworkSubmissions.markedDoneAt,
    })
    .from(homeworkSubmissions)
    .innerJoin(users, eq(users.id, homeworkSubmissions.studentUserId))
    .where(eq(homeworkSubmissions.homeworkId, homeworkId))
    .orderBy(asc(homeworkSubmissions.status), asc(users.name));

  return { title: hw.title, dueAt: hw.dueAt, rows };
}

export type StudentHomeworkRow = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  dueAt: Date;
  status: "ASSIGNED" | "DONE" | "CHECKED";
};

async function homeworkForStudent(studentUserId: string, schoolId: string) {
  return db
    .select({
      id: homework.id,
      title: homework.title,
      description: homework.description,
      subject: subjects.name,
      dueAt: homework.dueAt,
      status: homeworkSubmissions.status,
    })
    .from(homeworkSubmissions)
    .innerJoin(homework, eq(homework.id, homeworkSubmissions.homeworkId))
    .leftJoin(subjects, eq(subjects.id, homework.subjectId))
    .where(
      and(
        eq(homeworkSubmissions.studentUserId, studentUserId),
        eq(homework.schoolId, schoolId),
      ),
    )
    .orderBy(asc(homework.dueAt));
}

/** Сурагч өөрийн даалгаврыг харна. */
export async function myHomework(viewer: Viewer): Promise<StudentHomeworkRow[]> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");
  return homeworkForStudent(viewer.userId, viewer.schoolId);
}

/** Эцэг эх хүүхдийнхээ даалгаврыг харна — асран хамгаалагч мөн эсэхийг шалгана. */
export async function childHomework(
  viewer: Viewer,
  childUserId: string,
): Promise<StudentHomeworkRow[]> {
  if (viewer.role !== "PARENT") throw new AccessError("ЭРХГҮЙ");
  const children = await childrenOf(viewer.userId);
  if (!children.includes(childUserId)) throw new AccessError("ЭРХГҮЙ");
  return homeworkForStudent(childUserId, viewer.schoolId);
}

/**
 * Сурагч «хийсэн» гэж тэмдэглэнэ.
 *
 * ⚠️ Зөвхөн өөрийн мөрийг. Багшийн шалгасан (`CHECKED`) мөрийг буцаахгүй.
 */
export async function markDone(viewer: Viewer, homeworkId: string): Promise<void> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");

  const result = await db
    .update(homeworkSubmissions)
    .set({ status: "DONE", markedDoneAt: new Date() })
    .where(
      and(
        eq(homeworkSubmissions.homeworkId, homeworkId),
        eq(homeworkSubmissions.studentUserId, viewer.userId),
        eq(homeworkSubmissions.status, "ASSIGNED"),
      ),
    )
    .returning({ id: homeworkSubmissions.id });

  if (result.length === 0) throw new AccessError("ЭРХГҮЙ");
}

/** Багш даалгавар өгөхөд сонгох хичээлүүд. */
export async function schoolSubjects(viewer: Viewer) {
  return db
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)
    .where(eq(subjects.schoolId, viewer.schoolId))
    .orderBy(asc(subjects.sortOrder));
}

/** Багшийн заадаг ангиуд. */
export async function myClasses(viewer: Viewer) {
  return db
    .select({ id: classes.id, name: classes.name, grade: classes.grade })
    .from(classes)
    .innerJoin(classMembers, eq(classMembers.classId, classes.id))
    .where(
      and(
        eq(classMembers.userId, viewer.userId),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .orderBy(asc(classes.grade), asc(classes.name));
}

/** Эцэг эхийн батлагдсан хүүхдүүд, нэр ба ангитай нь. */
export async function myChildren(viewer: Viewer) {
  const ids = await childrenOf(viewer.userId);
  if (ids.length === 0) return [];

  return db
    .select({
      id: users.id,
      name: users.name,
      className: classes.name,
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
    .where(inArray(users.id, ids))
    .orderBy(asc(users.name));
}
