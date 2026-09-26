import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes, credentials, schools, users } from "@/server/db/schema";
import { AccessError, childrenOf, rolesOf, type Viewer } from "@/server/auth/access";
import { hashPin, isWeakPin, verifyPin } from "@/server/auth/pin";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * Профайл — «би хэн бэ, яаж нэвтэрдэг вэ».
 *
 * Дараа нэмэгдэх зүйлс (оноо, шагнал, хэлний ахиц — `docs/BACKLOG.md`) энд
 * холбогдоно. Тиймээс бүтцийг дүр бүрд нээлттэй үлдээв.
 *
 * ⚠️ Энд харуулах бүх зүйл **өөрийнх нь** мэдээлэл. Өөр хүний профайл
 * харах зам НЭЭХГҮЙ — `docs/PERMISSIONS.md`-ийн дүрмийг тойрох гарц болно.
 */

export type ProfileChild = { id: string; name: string; className: string | null };
export type ProfileClass = { id: string; name: string; grade: number };

export type Profile = {
  name: string;
  /** Насанд хүрэгчид — нэвтрэх дугаар. Сурагчид NULL. */
  phone: string | null;
  /** Сурагчид — багшийн өгсөн код. Насанд хүрэгчид NULL. */
  loginCode: string | null;
  role: MembershipRole;
  otherRoles: MembershipRole[];
  schoolName: string;
  /** Сурагч, багшийн анги. Эцэг эх, эрхлэгчид хоосон. */
  classes: ProfileClass[];
  /** Эцэг эхийн хүүхдүүд. */
  children: ProfileChild[];
};

export async function myProfile(viewer: Viewer): Promise<Profile> {
  const [[me], [school], roles, [cred]] = await Promise.all([
    db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, viewer.userId))
      .limit(1),
    db
      .select({ name: schools.name })
      .from(schools)
      .where(eq(schools.id, viewer.schoolId))
      .limit(1),
    rolesOf(viewer.userId, viewer.schoolId),
    db
      .select({ loginCode: credentials.loginCode })
      .from(credentials)
      .where(eq(credentials.userId, viewer.userId))
      .limit(1),
  ]);

  if (!me) throw new AccessError("ЭРХГҮЙ");

  // Сурагч, багш аль аль нь `class_members`-ээр ангитай холбогддог.
  const myClasses =
    viewer.role === "STUDENT" || viewer.role === "TEACHER"
      ? await db
          .select({ id: classes.id, name: classes.name, grade: classes.grade })
          .from(classMembers)
          .innerJoin(
            classes,
            and(eq(classes.id, classMembers.classId), eq(classes.schoolId, viewer.schoolId)),
          )
          .where(
            and(
              eq(classMembers.userId, viewer.userId),
              eq(classMembers.role, viewer.role),
              eq(classMembers.status, "ACTIVE"),
            ),
          )
          .orderBy(asc(classes.name))
      : [];

  const children = viewer.role === "PARENT" ? await childrenWithClass(viewer) : [];

  return {
    name: me.name,
    // Сурагчид код, насанд хүрэгчид дугаар. Хоёуланг нь зэрэг харуулахгүй.
    phone: viewer.role === "STUDENT" ? null : me.phone,
    loginCode: viewer.role === "STUDENT" ? (cred?.loginCode ?? null) : null,
    role: viewer.role,
    otherRoles: roles.filter((r) => r !== viewer.role),
    schoolName: school?.name ?? "",
    classes: myClasses,
    children,
  };
}

/**
 * Эцэг эхийн батлагдсан хүүхдүүд.
 *
 * `homework/service.ts`-ийн `myChildren`-тэй төстэй ч тусдаа: тэр нь
 * даалгаврын хуудсанд зориулагдсан. Профайл дараа өсөх тул өөрийн асуулгатай
 * байх нь хоёуланг нь чөлөөтэй өөрчлөх боломж өгнө.
 */
async function childrenWithClass(viewer: Viewer): Promise<ProfileChild[]> {
  const ids = await childrenOf(viewer.userId);
  if (ids.length === 0) return [];

  const rows = await db
    .select({ id: users.id, name: users.name, className: classes.name })
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
    .orderBy(asc(users.name));

  return rows.filter((r) => ids.includes(r.id));
}

export type PinChangeResult =
  | { ok: true }
  | { ok: false; reason: "ОДООГИЙН_БУРУУ" | "ХЭТ_АМАРХАН" | "ИЖИЛ" | "ФОРМАТ" };

/**
 * Өөрийн PIN солих.
 *
 * ⚠️ Одоогийн PIN-ийг **заавал** асууна. Сесс нээлттэй байх нь хангалттай
 * биш: хүүхдийн утас ширээн дээр онгорхой хэвтэж байж болно. Багшийн
 * шинэчлэлтээс (`resetStudentPin`) ялгаатай нь энэ нь өөрийн үйлдэл тул
 * хуучныг мэдэж байх ёстой.
 */
export async function changeOwnPin(
  viewer: Viewer,
  currentPin: string,
  newPin: string,
): Promise<PinChangeResult> {
  if (!/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(currentPin)) {
    return { ok: false, reason: "ФОРМАТ" };
  }
  if (currentPin === newPin) return { ok: false, reason: "ИЖИЛ" };
  if (isWeakPin(newPin)) return { ok: false, reason: "ХЭТ_АМАРХАН" };

  const [row] = await db
    .select({ pinHash: credentials.pinHash })
    .from(credentials)
    .where(eq(credentials.userId, viewer.userId))
    .limit(1);

  if (!row || !(await verifyPin(currentPin, row.pinHash))) {
    return { ok: false, reason: "ОДООГИЙН_БУРУУ" };
  }

  await db
    .update(credentials)
    .set({ pinHash: await hashPin(newPin), failedAttempts: 0, lockedUntil: null })
    .where(eq(credentials.userId, viewer.userId));

  return { ok: true };
}
