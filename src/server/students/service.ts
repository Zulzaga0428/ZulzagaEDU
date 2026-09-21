import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLog, classMembers, classes, credentials, memberships, users } from "@/server/db/schema";
import { AccessError, teachesClass, type Viewer } from "@/server/auth/access";
import { issueStudentCredentials } from "@/server/auth/credentials";
import { generatePin, hashPin, isWeakPin } from "@/server/auth/pin";

/**
 * Сурагчийн бүртгэл — нэмэх, нэвтрэх эрхийг шинэчлэх.
 *
 * ⚠️ PIN нь hash хэлбэрээр хадгалагддаг тул **нэг л удаа харагдана**.
 * Дахин харах арга байхгүй — зөвхөн шинээр үүсгэнэ. Энэ нь эвгүй мэт
 * боловч зөв: багш ч, бид ч хүүхдийн PIN-ийг харж чадахгүй байх ёстой.
 */

/** Сул PIN гарвал дахин оролдоно (1111, 1234 гэх мэт). */
function safePin(): string {
  for (let i = 0; i < 20; i++) {
    const pin = generatePin();
    if (!isWeakPin(pin)) return pin;
  }
  return "2748";
}

export type NewStudent = { loginCode: string; pin: string; name: string };

/**
 * Ангид шинэ сурагч нэмнэ.
 *
 * Хүүхдэд имэйл ч, утас ч байхгүй — зөвхөн нэр, код, PIN.
 * `docs/ERD.md` §4.
 */
export async function addStudent(
  viewer: Viewer,
  classId: string,
  rawName: string,
): Promise<NewStudent> {
  if (viewer.role !== "TEACHER" && viewer.role !== "ACADEMIC_MANAGER") {
    throw new AccessError("ЭРХГҮЙ");
  }
  if (viewer.role === "TEACHER" && !(await teachesClass(viewer.userId, classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new Error("Нэр хэт богино байна.");

  const [klass] = await db
    .select({ name: classes.name })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolId, viewer.schoolId)))
    .limit(1);
  if (!klass) throw new AccessError("ЭРХГҮЙ");

  const pin = safePin();

  const userId = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({ name }).returning({ id: users.id });

    await tx.insert(memberships).values({
      userId: created.id,
      schoolId: viewer.schoolId,
      role: "STUDENT",
    });
    await tx.insert(classMembers).values({
      classId,
      userId: created.id,
      role: "STUDENT",
    });
    await tx.insert(auditLog).values({
      schoolId: viewer.schoolId,
      actorUserId: viewer.userId,
      action: "STUDENT_ADDED",
      targetType: "student",
      targetId: created.id,
      meta: { classId },
    });

    return created.id;
  });

  // Код давхцвал дотроо дахин оролддог тул гүйлгээний гадна.
  const { loginCode } = await issueStudentCredentials(userId, klass.name, pin);

  return { loginCode, pin, name };
}

/**
 * Сурагчийн PIN-ийг шинэчилнэ.
 *
 * 8 настай хүүхэд PIN-ээ мартах нь ЗААВАЛ болно. Багш тэр даруй засаж
 * чаддаг байх ёстой — эс бөгөөс бидэн рүү залгана.
 *
 * Код нь хэвээр үлдэнэ: хүүхэд кодоо цаасан дээрээ наасан байдаг,
 * түүнийг сольбол дахиад л төөрөгдөл болно.
 */
export async function resetStudentPin(
  viewer: Viewer,
  studentUserId: string,
): Promise<{ pin: string; loginCode: string; name: string }> {
  if (viewer.role !== "TEACHER" && viewer.role !== "ACADEMIC_MANAGER") {
    throw new AccessError("ЭРХГҮЙ");
  }

  // Тэр сурагч энэ багшийн ангид байгаа эсэхийг батална.
  const [row] = await db
    .select({
      classId: classMembers.classId,
      name: users.name,
      loginCode: credentials.loginCode,
    })
    .from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId))
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .leftJoin(credentials, eq(credentials.userId, users.id))
    .where(
      and(
        eq(classMembers.userId, studentUserId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);
  if (!row) throw new AccessError("ЭРХГҮЙ");
  if (
    viewer.role === "TEACHER" &&
    !(await teachesClass(viewer.userId, row.classId, viewer.schoolId))
  ) {
    throw new AccessError("ЭРХГҮЙ");
  }

  const pin = safePin();
  const [klass] = await db
    .select({ name: classes.name })
    .from(classes)
    .where(eq(classes.id, row.classId))
    .limit(1);

  let loginCode: string;
  if (row.loginCode) {
    // Кодыг хэвээр нь үлдээж зөвхөн PIN-ийг солино. Түгжээг ч тайлна —
    // хүүхэд олон удаа андуурсны улмаас түгжигдсэн байж магадгүй.
    await db
      .update(credentials)
      .set({ pinHash: await hashPin(pin), failedAttempts: 0, lockedUntil: null })
      .where(eq(credentials.userId, studentUserId));
    loginCode = row.loginCode;
  } else {
    ({ loginCode } = await issueStudentCredentials(studentUserId, klass?.name ?? "S", pin));
  }

  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "STUDENT_PIN_RESET",
    targetType: "student",
    targetId: studentUserId,
    meta: {},
  });

  return { pin, loginCode, name: row.name };
}
