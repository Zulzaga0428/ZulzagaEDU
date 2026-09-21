import "server-only";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import {
  announcements,
  auditLog,
  classMembers,
  classes,
  guardians,
  users,
} from "@/server/db/schema";
import { AccessError, childrenOf, teachesClass, type Viewer } from "@/server/auth/access";

/**
 * Зарлал — багш ангидаа, эрхлэгч сургууль даяар мэдээлэл өгнө.
 *
 * ⛔ ЭНЭ НЬ ЧАТ БИШ. Хариу бичих боломж зориуд байхгүй.
 *
 * Хариу бичих боломж өгвөл 24 эцэг эхийн яриа болж хувирна, багш уншиж
 * амжихгүй, хоёр долоо хоногийн дараа орхино. Энэ ангиллын аппууд яг ингэж
 * «хоёр дахь inbox» болж үхдэг. Мессежлэх хэрэгцээ гарвал Messenger байна —
 * бид түүнтэй өрсөлдөхгүй.
 *
 * Мөн зарлал нь тусдаа хайрцаг биш — эцэг эх, сурагчийн НҮҮРЭН дээр гарна.
 */

export type Audience = "ALL" | "PARENTS" | "STUDENTS";

export type AnnouncementRow = {
  id: string;
  body: string;
  audience: Audience;
  createdAt: Date;
  authorName: string | null;
  className: string | null;
};

const MAX_BODY = 2000;

/** Багш ангидаа, эрхлэгч сургууль даяар. */
export async function postAnnouncement(
  viewer: Viewer,
  input: { classId: string | null; body: string; audience: Audience },
): Promise<string> {
  const body = input.body.trim();
  if (body.length === 0) throw new Error("Зарлал хоосон байна.");
  if (body.length > MAX_BODY) throw new Error("Зарлал хэт урт байна.");

  if (input.classId === null) {
    // Сургууль даяарх зарлалыг зөвхөн эрхлэгч бичнэ.
    if (viewer.role !== "ACADEMIC_MANAGER") throw new AccessError("ЭРХГҮЙ");
  } else if (viewer.role === "TEACHER") {
    if (!(await teachesClass(viewer.userId, input.classId, viewer.schoolId))) {
      throw new AccessError("ЭРХГҮЙ");
    }
  } else if (viewer.role === "ACADEMIC_MANAGER") {
    const [klass] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, input.classId), eq(classes.schoolId, viewer.schoolId)))
      .limit(1);
    if (!klass) throw new AccessError("ЭРХГҮЙ");
  } else {
    throw new AccessError("ЭРХГҮЙ");
  }

  const [row] = await db
    .insert(announcements)
    .values({
      schoolId: viewer.schoolId,
      classId: input.classId,
      createdBy: viewer.userId,
      body,
      audience: input.audience,
    })
    .returning({ id: announcements.id });

  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "ANNOUNCEMENT_POSTED",
    targetType: "announcement",
    targetId: row.id,
    meta: { classId: input.classId, audience: input.audience },
  });

  return row.id;
}

function selectAnnouncement() {
  return {
    id: announcements.id,
    body: announcements.body,
    audience: announcements.audience,
    createdAt: announcements.createdAt,
    authorName: users.name,
    className: classes.name,
  };
}

/** Багшийн ангийн зарлалууд. */
export async function classAnnouncements(
  viewer: Viewer,
  classId: string,
  limit = 20,
): Promise<AnnouncementRow[]> {
  if (!(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  return db
    .select(selectAnnouncement())
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.createdBy))
    .leftJoin(classes, eq(classes.id, announcements.classId))
    .where(
      and(
        eq(announcements.schoolId, viewer.schoolId),
        or(eq(announcements.classId, classId), isNull(announcements.classId)),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
}

/**
 * Тухайн ангиудад хамаарах зарлалууд + сургууль даяарх.
 *
 * `audience` нь хэнд харагдахыг шийднэ: эцэг эхэд зориулсан зарлал сурагчид
 * харагдахгүй, эсрэгээр ч мөн адил.
 */
async function forClasses(
  schoolId: string,
  classIds: string[],
  who: "PARENTS" | "STUDENTS",
  limit: number,
): Promise<AnnouncementRow[]> {
  const scope =
    classIds.length > 0
      ? or(inArray(announcements.classId, classIds), isNull(announcements.classId))
      : isNull(announcements.classId);

  return db
    .select(selectAnnouncement())
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.createdBy))
    .leftJoin(classes, eq(classes.id, announcements.classId))
    .where(
      and(
        eq(announcements.schoolId, schoolId),
        scope,
        or(eq(announcements.audience, "ALL"), eq(announcements.audience, who)),
      ),
    )
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
}

/** Сурагчийн харах зарлалууд. */
export async function myAnnouncements(viewer: Viewer, limit = 5): Promise<AnnouncementRow[]> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");

  const rows = await db
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
    );

  return forClasses(viewer.schoolId, rows.map((r) => r.classId), "STUDENTS", limit);
}

/** Эцэг эхийн харах зарлалууд — хүүхдүүдийнх нь ангиудаар. */
export async function parentAnnouncements(
  viewer: Viewer,
  limit = 5,
): Promise<AnnouncementRow[]> {
  if (viewer.role !== "PARENT") throw new AccessError("ЭРХГҮЙ");

  const children = await childrenOf(viewer.userId);
  const rows =
    children.length === 0
      ? []
      : await db
          .selectDistinct({ classId: classMembers.classId })
          .from(classMembers)
          .innerJoin(classes, eq(classes.id, classMembers.classId))
          .where(
            and(
              inArray(classMembers.userId, children),
              eq(classMembers.role, "STUDENT"),
              eq(classMembers.status, "ACTIVE"),
              eq(classes.schoolId, viewer.schoolId),
            ),
          );

  return forClasses(viewer.schoolId, rows.map((r) => r.classId), "PARENTS", limit);
}

/** Зарлал устгах — зөвхөн өөрийн бичсэнийг. */
export async function deleteAnnouncement(viewer: Viewer, id: string): Promise<void> {
  const [row] = await db
    .select({ createdBy: announcements.createdBy })
    .from(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.schoolId, viewer.schoolId)))
    .limit(1);
  if (!row) throw new AccessError("ЭРХГҮЙ");
  if (row.createdBy !== viewer.userId) throw new AccessError("ЭРХГҮЙ");

  await db.delete(announcements).where(eq(announcements.id, id));
  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "ANNOUNCEMENT_DELETED",
    targetType: "announcement",
    targetId: id,
    meta: {},
  });
}

/** Зарлал хүлээн авах хүмүүс — мэдэгдэл илгээхэд. */
export async function announcementRecipients(
  schoolId: string,
  classId: string | null,
  audience: Audience,
): Promise<{ students: string[]; parents: string[] }> {
  const studentRows = classId
    ? await db
        .select({ userId: classMembers.userId })
        .from(classMembers)
        .where(
          and(
            eq(classMembers.classId, classId),
            eq(classMembers.role, "STUDENT"),
            eq(classMembers.status, "ACTIVE"),
          ),
        )
    : await db
        .select({ userId: classMembers.userId })
        .from(classMembers)
        .innerJoin(classes, eq(classes.id, classMembers.classId))
        .where(
          and(
            eq(classes.schoolId, schoolId),
            eq(classMembers.role, "STUDENT"),
            eq(classMembers.status, "ACTIVE"),
          ),
        );

  const studentIds = [...new Set(studentRows.map((r) => r.userId))];

  const parentRows =
    studentIds.length === 0
      ? []
      : await db
          .selectDistinct({ id: guardians.parentUserId })
          .from(guardians)
          .where(
            and(
              inArray(guardians.studentUserId, studentIds),
              eq(guardians.status, "ACTIVE"),
            ),
          );

  const parentIds = parentRows.map((r) => r.id);

  return {
    students: audience === "PARENTS" ? [] : studentIds,
    parents: audience === "STUDENTS" ? [] : parentIds,
  };
}
