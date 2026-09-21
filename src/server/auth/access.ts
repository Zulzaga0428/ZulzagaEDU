import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes, guardians, memberships } from "@/server/db/schema";
import { readSessionCookie } from "@/server/auth/session";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * Хандалтын давхарга — `docs/PERMISSIONS.md`-ийн хэрэгжилт.
 *
 * Гурван зарчим:
 *   1. Эрхийг зөвхөн сервер шийднэ
 *   2. Бүх асуулга сургуулиар шүүгдэнэ
 *   3. Хандалт нь ХОЛБООСООР тодорхойлогдоно, дүрээр биш —
 *      «багш учраас» биш, «энэ ангийн багш учраас»
 */

export type Viewer = {
  userId: string;
  schoolId: string;
  role: MembershipRole;
};

/**
 * Одоогийн хэрэглэгч. Cookie-г уншаад, гишүүнчлэл нь ОДОО Ч ГЭСЭН идэвхтэй
 * эсэхийг өгөгдлийн сангаас шалгана.
 *
 * ⚠️ Cookie-д итгээд зогсвол хасагдсан багш cookie-гийнхээ хугацаа дуустал
 * хандсан хэвээр байна. Тиймээс индексжүүлсэн нэг асуулга нэмэлтээр явна.
 */
export async function getViewer(): Promise<Viewer | null> {
  const session = await readSessionCookie();
  if (!session) return null;

  const [row] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.userId),
        eq(memberships.schoolId, session.schoolId),
        eq(memberships.role, session.role),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!row) return null;
  return { userId: session.userId, schoolId: session.schoolId, role: row.role };
}

/** Нэвтрээгүй бол алдаа. Хуудас өөрөө redirect хийнэ. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AccessError("НЭВТРЭЭГҮЙ");
  return viewer;
}

export async function requireRole(...allowed: MembershipRole[]): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!allowed.includes(viewer.role)) throw new AccessError("ЭРХГҮЙ");
  return viewer;
}

export class AccessError extends Error {
  constructor(public readonly code: "НЭВТРЭЭГҮЙ" | "ЭРХГҮЙ") {
    super(code);
    this.name = "AccessError";
  }
}

/* ────────────────────────── шалгуурууд ────────────────────────── */

export async function isMember(userId: string, schoolId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.schoolId, schoolId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function isManagerOf(userId: string, schoolId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.schoolId, schoolId),
        eq(memberships.role, "ACADEMIC_MANAGER"),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * ⚠️ Ангийн `id` нь таамаглахад бэрх ч гэсэн нууц биш. Тиймээс энд
 * `schoolId`-г ЗААВАЛ давхар шалгана — эс бөгөөс өөр сургуулийн ангийн
 * дугаарыг мэдсэн хүн хандах зам нээгдэнэ.
 */
export async function teachesClass(
  userId: string,
  classId: string,
  schoolId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, userId),
        eq(classMembers.classId, classId),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, schoolId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function studiesIn(
  userId: string,
  classId: string,
  schoolId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, userId),
        eq(classMembers.classId, classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, schoolId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function isGuardianOf(parentUserId: string, studentUserId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: guardians.id })
    .from(guardians)
    .where(
      and(
        eq(guardians.parentUserId, parentUserId),
        eq(guardians.studentUserId, studentUserId),
        eq(guardians.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Эцэг эхийн батлагдсан хүүхдүүдийн жагсаалт. */
export async function childrenOf(parentUserId: string): Promise<string[]> {
  const rows = await db
    .select({ studentUserId: guardians.studentUserId })
    .from(guardians)
    .where(and(eq(guardians.parentUserId, parentUserId), eq(guardians.status, "ACTIVE")));
  return rows.map((r) => r.studentUserId);
}

/**
 * Эцэг эх ангийг ХҮҮХДЭЭРЭЭ ДАМЖУУЛАН харна — ангид шууд гишүүн биш.
 * `docs/ERD.md` §3.
 */
export async function guardianSeesClass(
  parentUserId: string,
  classId: string,
  schoolId: string,
): Promise<boolean> {
  const children = await childrenOf(parentUserId);
  if (children.length === 0) return false;

  const [row] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        inArray(classMembers.userId, children),
        eq(classMembers.classId, classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, schoolId),
      ),
    )
    .limit(1);
  return Boolean(row);
}
