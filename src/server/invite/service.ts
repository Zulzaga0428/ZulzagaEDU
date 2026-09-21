import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import {
  auditLog,
  classMembers,
  classes,
  credentials,
  guardians,
  invitations,
  memberships,
  schools,
  users,
} from "@/server/db/schema";
import { AccessError, teachesClass, type Viewer } from "@/server/auth/access";
import { setAdultCredentials } from "@/server/auth/credentials";
import { isWeakPin, verifyPin } from "@/server/auth/pin";

/**
 * Урилгын гинж — багш QR гаргана, эцэг эх нэгдэнэ, багш батална.
 *
 * Аюулгүй байдлын гурван хаалга:
 *
 *   1. Токеныг ӨӨРИЙГ НЬ хадгалахгүй, зөвхөн hash. Сан алдагдсан ч
 *      хүчинтэй урилга гарахгүй.
 *   2. Урилга хугацаатай, тоо хязгаартай.
 *   3. Хамгийн чухал нь: урилга хүлээн авсан ч `guardians` мөр `PENDING`
 *      хэвээр. Хүүхдийн өгөгдөлд хүрэхийн тулд **багш батлах ёстой**.
 *      Линк санамсаргүй дамжсан ч хүүхдэд хүрэхгүй.
 */

const EXPIRY_DAYS = 7;
/** Нэг хүүхдэд ихэвчлэн ээж, аав хоёр нэгддэг. */
const DEFAULT_USES = 2;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Багш тодорхой сурагчид эцэг эхийн урилга гаргана. */
export async function createParentInvite(
  viewer: Viewer,
  classId: string,
  studentUserId: string,
): Promise<{ token: string; expiresAt: Date }> {
  if (viewer.role !== "TEACHER" && viewer.role !== "ACADEMIC_MANAGER") {
    throw new AccessError("ЭРХГҮЙ");
  }
  if (viewer.role === "TEACHER" && !(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  // Сурагч яг энэ ангид байгаа эсэхийг батална.
  const [member] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.userId, studentUserId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);
  if (!member) throw new AccessError("ЭРХГҮЙ");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 3600 * 1000);

  await db.insert(invitations).values({
    schoolId: viewer.schoolId,
    classId,
    kind: "PARENT",
    tokenHash: hashToken(token),
    targetStudentId: studentUserId,
    createdBy: viewer.userId,
    expiresAt,
    maxUses: DEFAULT_USES,
  });

  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "INVITE_CREATED",
    targetType: "student",
    targetId: studentUserId,
    meta: { classId, kind: "PARENT" },
  });

  return { token, expiresAt };
}

export type InviteView = {
  schoolName: string;
  className: string;
  studentName: string;
  studentUserId: string;
  schoolId: string;
};

/** Урилгыг уншина. Хүчингүй бол null — шалтгааныг задлахгүй. */
export async function readInvite(token: string): Promise<InviteView | null> {
  const [row] = await db
    .select({
      schoolId: invitations.schoolId,
      studentUserId: invitations.targetStudentId,
      className: classes.name,
      expiresAt: invitations.expiresAt,
      revokedAt: invitations.revokedAt,
      maxUses: invitations.maxUses,
      usedCount: invitations.usedCount,
    })
    .from(invitations)
    .leftJoin(classes, eq(classes.id, invitations.classId))
    .where(and(eq(invitations.tokenHash, hashToken(token)), eq(invitations.kind, "PARENT")))
    .limit(1);

  if (!row || !row.studentUserId) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  if (row.usedCount >= row.maxUses) return null;

  const [student] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, row.studentUserId))
    .limit(1);
  if (!student) return null;

  const [school] = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, row.schoolId))
    .limit(1);

  return {
    schoolName: school?.name ?? "",
    className: row.className ?? "",
    studentName: student.name,
    studentUserId: row.studentUserId,
    schoolId: row.schoolId,
  };
}

export type AcceptResult =
  | { ok: true; userId: string; schoolId: string }
  | { ok: false; reason: "ХҮЧИНГҮЙ" | "PIN_СУЛ" | "PIN_БУРУУ" | "АЛЬ_ХЭДИЙН" };

/**
 * Эцэг эх урилгыг хүлээн авна.
 *
 * Тэр дугаар аль хэдийн бүртгэлтэй бол (хоёр дахь хүүхдээ холбож байгаа
 * эцэг эх) шинэ данс үүсгэхгүй — PIN-ээр нь таньж, зөвхөн шинэ холбоос
 * нэмнэ. Эс бөгөөс нэг хүн хоёр данстай болно.
 */
export async function acceptParentInvite(
  token: string,
  input: { name: string; phone: string; pin: string; relation: "MOTHER" | "FATHER" | "GUARDIAN" },
): Promise<AcceptResult> {
  const invite = await readInvite(token);
  if (!invite) return { ok: false, reason: "ХҮЧИНГҮЙ" };

  const phone = input.phone.replace(/\s/g, "");
  const name = input.name.trim();
  if (!name || !phone) return { ok: false, reason: "ХҮЧИНГҮЙ" };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  let userId: string;

  if (existing) {
    // Байгаа хүн — PIN-ээр таньж байж холбоно.
    const [cred] = await db
      .select({ pinHash: credentials.pinHash })
      .from(credentials)
      .where(eq(credentials.userId, existing.id))
      .limit(1);
    if (!cred || !(await verifyPin(input.pin, cred.pinHash))) {
      return { ok: false, reason: "PIN_БУРУУ" };
    }
    userId = existing.id;
  } else {
    if (isWeakPin(input.pin)) return { ok: false, reason: "PIN_СУЛ" };
    const [created] = await db.insert(users).values({ name, phone }).returning({ id: users.id });
    userId = created.id;
    await setAdultCredentials(userId, input.pin);
  }

  const [already] = await db
    .select({ id: guardians.id })
    .from(guardians)
    .where(
      and(eq(guardians.parentUserId, userId), eq(guardians.studentUserId, invite.studentUserId)),
    )
    .limit(1);
  if (already) return { ok: false, reason: "АЛЬ_ХЭДИЙН" };

  await db.transaction(async (tx) => {
    await tx
      .insert(memberships)
      .values({ userId, schoolId: invite.schoolId, role: "PARENT" })
      .onConflictDoNothing();

    // ⚠️ PENDING. Багш батлах хүртэл хүүхдийн юу ч харагдахгүй.
    await tx.insert(guardians).values({
      parentUserId: userId,
      studentUserId: invite.studentUserId,
      relation: input.relation,
      status: "PENDING",
    });

    await tx
      .update(invitations)
      .set({ usedCount: sql`${invitations.usedCount} + 1` })
      .where(eq(invitations.tokenHash, hashToken(token)));

    await tx.insert(auditLog).values({
      schoolId: invite.schoolId,
      actorUserId: userId,
      action: "INVITE_ACCEPTED",
      targetType: "student",
      targetId: invite.studentUserId,
      meta: { relation: input.relation },
    });
  });

  return { ok: true, userId, schoolId: invite.schoolId };
}

export type PendingGuardian = {
  id: string;
  parentName: string;
  parentPhone: string | null;
  studentName: string;
  relation: "MOTHER" | "FATHER" | "GUARDIAN";
};

/** Багшийн батлах хүлээж буй холбоосууд — зөвхөн өөрийн ангийн сурагчдын. */
export async function pendingGuardians(
  viewer: Viewer,
  classId: string,
): Promise<PendingGuardian[]> {
  if (!(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  // Нэг хүснэгтээс хоёр талыг татах тул alias хэрэгтэй.
  const parent = alias(users, "parent");
  const student = alias(users, "student");

  return db
    .select({
      id: guardians.id,
      parentName: parent.name,
      parentPhone: parent.phone,
      studentName: student.name,
      relation: guardians.relation,
    })
    .from(guardians)
    .innerJoin(parent, eq(parent.id, guardians.parentUserId))
    .innerJoin(student, eq(student.id, guardians.studentUserId))
    .innerJoin(classMembers, eq(classMembers.userId, guardians.studentUserId))
    .where(
      and(
        eq(guardians.status, "PENDING"),
        eq(classMembers.classId, classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(student.name));
}

/**
 * Багш эцэг эх–хүүхдийн холбоосыг батална.
 *
 * ⚠️ Энэ бол хүүхдийн өгөгдлийн ГОЛ ХААЛГА. Өөр хаанаас ч `ACTIVE`
 * болгох зам байх ёсгүй.
 */
export async function decideGuardian(
  viewer: Viewer,
  guardianId: string,
  decision: "ACTIVE" | "REJECTED",
): Promise<void> {
  if (viewer.role !== "TEACHER" && viewer.role !== "ACADEMIC_MANAGER") {
    throw new AccessError("ЭРХГҮЙ");
  }

  const [row] = await db
    .select({ studentUserId: guardians.studentUserId, status: guardians.status })
    .from(guardians)
    .where(eq(guardians.id, guardianId))
    .limit(1);
  if (!row || row.status !== "PENDING") throw new AccessError("ЭРХГҮЙ");

  // Тэр сурагч энэ багшийн ангид байгаа эсэхийг батална.
  const [member] = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, row.studentUserId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);
  if (!member) throw new AccessError("ЭРХГҮЙ");
  if (
    viewer.role === "TEACHER" &&
    !(await teachesClass(viewer.userId, member.classId, viewer.schoolId))
  ) {
    throw new AccessError("ЭРХГҮЙ");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(guardians)
      .set({ status: decision, verifiedBy: viewer.userId })
      .where(eq(guardians.id, guardianId));

    await tx.insert(auditLog).values({
      schoolId: viewer.schoolId,
      actorUserId: viewer.userId,
      action: decision === "ACTIVE" ? "GUARDIAN_VERIFIED" : "GUARDIAN_REJECTED",
      targetType: "guardian",
      targetId: guardianId,
      meta: { studentUserId: row.studentUserId },
    });
  });
}

export type ClassStudent = {
  id: string;
  name: string;
  loginCode: string | null;
  guardianCount: number;
  pendingCount: number;
};

/** Багшийн ангийн сурагчид — урилгын байдалтай нь. */
export async function classStudents(viewer: Viewer, classId: string): Promise<ClassStudent[]> {
  if (!(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      loginCode: credentials.loginCode,
      guardianCount: sql<number>`(
        select count(*)::int from guardians g
        where g.student_user_id = users.id and g.status = 'ACTIVE'
      )`,
      pendingCount: sql<number>`(
        select count(*)::int from guardians g
        where g.student_user_id = users.id and g.status = 'PENDING'
      )`,
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .leftJoin(credentials, eq(credentials.userId, users.id))
    .where(
      and(
        eq(classMembers.classId, classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(users.name));
}
