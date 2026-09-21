import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  auditLog,
  classMembers,
  classes,
  credentials,
  memberships,
  users,
} from "@/server/db/schema";
import { AccessError, type Viewer } from "@/server/auth/access";
import { setAdultCredentials } from "@/server/auth/credentials";
import { generatePin, isWeakPin } from "@/server/auth/pin";

/**
 * Эрхлэгчийн удирдлага — багш нэмэх, анги үүсгэх, багшийг ангид хуваарилах.
 *
 * Энэ давхарга байхгүй байхад шинэ багш системд орсон ч юу ч хийж чаддаггүй
 * байв: гишүүнчлэлтэй атлаа ангигүй тул даалгавар ч өгч чадахгүй, хуваарь ч
 * оруулж чадахгүй.
 */

function requireManager(viewer: Viewer): void {
  if (viewer.role !== "ACADEMIC_MANAGER") throw new AccessError("ЭРХГҮЙ");
}

function safePin(): string {
  for (let i = 0; i < 20; i++) {
    const pin = generatePin();
    if (!isWeakPin(pin)) return pin;
  }
  return "2748";
}

export type NewTeacher = { name: string; phone: string; pin: string };

/**
 * Багш нэмнэ.
 *
 * ⚠️ PIN нэг л удаа харагдана — hash хэлбэрээр хадгалагдана. Эрхлэгч багшдаа
 * дамжуулж өгнө, багш дараа нь өөрөө солино.
 */
export async function addTeacher(
  viewer: Viewer,
  rawName: string,
  rawPhone: string,
): Promise<NewTeacher> {
  requireManager(viewer);

  const name = rawName.trim().replace(/\s+/g, " ");
  const phone = rawPhone.replace(/\s/g, "");
  if (name.length < 2) throw new Error("Нэр хэт богино байна.");
  if (!/^\d{8}$/.test(phone)) throw new Error("Утасны дугаар 8 оронтой байх ёстой.");

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  const pin = safePin();

  if (existing) {
    // Тэр хүн аль хэдийн системд байна (жишээ нь эцэг эх байсан) — шинэ
    // данс үүсгэхгүй, зөвхөн багшийн эрх нэмнэ. PIN-ийг нь ХӨНДӨХГҮЙ.
    await db
      .insert(memberships)
      .values({ userId: existing.id, schoolId: viewer.schoolId, role: "TEACHER" })
      .onConflictDoNothing();

    await db.insert(auditLog).values({
      schoolId: viewer.schoolId,
      actorUserId: viewer.userId,
      action: "TEACHER_ADDED",
      targetType: "user",
      targetId: existing.id,
      meta: { existingUser: true },
    });

    return { name, phone, pin: "" };
  }

  const userId = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({ name, phone }).returning({ id: users.id });
    await tx.insert(memberships).values({
      userId: created.id,
      schoolId: viewer.schoolId,
      role: "TEACHER",
    });
    await tx.insert(auditLog).values({
      schoolId: viewer.schoolId,
      actorUserId: viewer.userId,
      action: "TEACHER_ADDED",
      targetType: "user",
      targetId: created.id,
      meta: {},
    });
    return created.id;
  });

  await setAdultCredentials(userId, pin);
  return { name, phone, pin };
}

/** Багшийн PIN-ийг шинэчилнэ — мартсан үед. */
export async function resetTeacherPin(viewer: Viewer, teacherUserId: string): Promise<string> {
  requireManager(viewer);

  const [member] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, teacherUserId),
        eq(memberships.schoolId, viewer.schoolId),
        eq(memberships.role, "TEACHER"),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!member) throw new AccessError("ЭРХГҮЙ");

  const pin = safePin();
  await setAdultCredentials(teacherUserId, pin);
  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "TEACHER_PIN_RESET",
    targetType: "user",
    targetId: teacherUserId,
    meta: {},
  });
  return pin;
}

export async function createClass(
  viewer: Viewer,
  rawName: string,
  grade: number,
  academicYear: string,
): Promise<string> {
  requireManager(viewer);

  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 1) throw new Error("Ангийн нэр хоосон байна.");
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
    throw new Error("Анги 1–12 хооронд байна.");
  }

  const [created] = await db
    .insert(classes)
    .values({ schoolId: viewer.schoolId, name, grade, academicYear, createdBy: viewer.userId })
    .returning({ id: classes.id });

  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "CLASS_CREATED",
    targetType: "class",
    targetId: created.id,
    meta: { name, grade },
  });

  return created.id;
}

/**
 * Багшийг ангид хуваарилна.
 *
 * Энэ бол багш ажиллаж эхлэх түлхүүр — гишүүнчлэл дангаараа хангалтгүй,
 * даалгавар өгөх, хуваарь оруулах бүх эрх ангийн холбоосоос эхэлдэг.
 */
export async function assignTeacher(
  viewer: Viewer,
  classId: string,
  teacherUserId: string,
): Promise<void> {
  requireManager(viewer);

  const [klass] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolId, viewer.schoolId)))
    .limit(1);
  if (!klass) throw new AccessError("ЭРХГҮЙ");

  const [member] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, teacherUserId),
        eq(memberships.schoolId, viewer.schoolId),
        eq(memberships.role, "TEACHER"),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!member) throw new AccessError("ЭРХГҮЙ");

  await db
    .insert(classMembers)
    .values({ classId, userId: teacherUserId, role: "TEACHER" })
    .onConflictDoUpdate({
      target: [classMembers.classId, classMembers.userId, classMembers.role],
      set: { status: "ACTIVE" },
    });

  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "TEACHER_ASSIGNED",
    targetType: "class",
    targetId: classId,
    meta: { teacherUserId },
  });
}

export async function unassignTeacher(
  viewer: Viewer,
  classId: string,
  teacherUserId: string,
): Promise<void> {
  requireManager(viewer);

  const [klass] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolId, viewer.schoolId)))
    .limit(1);
  if (!klass) throw new AccessError("ЭРХГҮЙ");

  await db
    .update(classMembers)
    .set({ status: "REMOVED" })
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, teacherUserId),
        eq(classMembers.role, "TEACHER"),
      ),
    );

  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "TEACHER_UNASSIGNED",
    targetType: "class",
    targetId: classId,
    meta: { teacherUserId },
  });
}

export type TeacherRow = {
  id: string;
  name: string;
  phone: string | null;
  hasPin: boolean;
  classNames: string;
};

export async function listTeachers(viewer: Viewer): Promise<TeacherRow[]> {
  requireManager(viewer);

  return db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      hasPin: sql<boolean>`(${credentials.userId} is not null)`,
      classNames: sql<string>`coalesce((
        select string_agg(c.name, ', ' order by c.name)
        from class_members cm
        join classes c on c.id = cm.class_id
        where cm.user_id = users.id and cm.role = 'TEACHER'
          and cm.status = 'ACTIVE' and c.school_id = ${viewer.schoolId}
      ), '')`,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .leftJoin(credentials, eq(credentials.userId, users.id))
    .where(
      and(
        eq(memberships.schoolId, viewer.schoolId),
        eq(memberships.role, "TEACHER"),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(users.name));
}

export type ManagedClass = {
  id: string;
  name: string;
  grade: number;
  students: number;
  teacherNames: string;
};

export async function listClasses(viewer: Viewer): Promise<ManagedClass[]> {
  requireManager(viewer);

  return db
    .select({
      id: classes.id,
      name: classes.name,
      grade: classes.grade,
      students: sql<number>`(
        select count(*)::int from class_members cm
        where cm.class_id = classes.id and cm.role = 'STUDENT' and cm.status = 'ACTIVE'
      )`,
      teacherNames: sql<string>`coalesce((
        select string_agg(u.name, ', ' order by u.name)
        from class_members cm join users u on u.id = cm.user_id
        where cm.class_id = classes.id and cm.role = 'TEACHER' and cm.status = 'ACTIVE'
      ), '')`,
    })
    .from(classes)
    .where(and(eq(classes.schoolId, viewer.schoolId), isNull(classes.archivedAt)))
    .orderBy(asc(classes.grade), asc(classes.name));
}

/** Одоогийн хичээлийн жил — 9-р сараас эхэлнэ. */
export function currentAcademicYear(now: Date = new Date()): string {
  const ub = new Date(now.getTime() + 8 * 3600_000);
  const y = ub.getUTCFullYear();
  const startYear = ub.getUTCMonth() + 1 >= 9 ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}
