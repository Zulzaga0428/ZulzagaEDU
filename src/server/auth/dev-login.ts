import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, schools, users } from "@/server/db/schema";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * ТҮР ЗУУРЫН нэвтрэлт — Google холбогдох хүртэл.
 *
 * ⚠️ Энэ зам нууц үг асуухгүй. Хэн ч өөрийгөө эрхлэгч болгож чадна.
 * Тиймээс `DEV_LOGIN_ENABLED=1` тохируулагдсан үед л ажиллана, бусад
 * тохиолдолд байхгүй мэт биеэ авч явна.
 *
 * ⛔ ЖИНХЭНЭ сурагчийн өгөгдөл орохоос ӨМНӨ энэ хувьсагчийг Railway-гээс
 * устгах ёстой. Google нэвтрэлт орох үед энэ файл бүхэлдээ устана.
 */
export function isDevLoginEnabled(): boolean {
  return process.env.DEV_LOGIN_ENABLED === "1";
}

export type DevAccount = {
  userId: string;
  schoolId: string;
  schoolName: string;
  name: string;
  role: MembershipRole;
};

/** Идэвхтэй гишүүнчлэл бүрийг нэг мөр болгож буцаана (хоёр дүртэй хүн 2 мөр). */
export async function listDevAccounts(): Promise<DevAccount[]> {
  if (!isDevLoginEnabled()) return [];

  return db
    .select({
      userId: users.id,
      schoolId: schools.id,
      schoolName: schools.name,
      name: users.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(schools, eq(schools.id, memberships.schoolId))
    .where(eq(memberships.status, "ACTIVE"))
    .orderBy(asc(memberships.role), asc(users.name));
}

/** Сонгосон мөр бодитоор байгаа эсэхийг батална — форм дангаараа хангалтгүй. */
export async function devAccountExists(
  userId: string,
  schoolId: string,
  role: MembershipRole,
): Promise<boolean> {
  if (!isDevLoginEnabled()) return false;

  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.schoolId, schoolId),
        eq(memberships.role, role),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
