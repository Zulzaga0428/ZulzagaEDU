import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, schools, users } from "@/server/db/schema";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * ТҮР ЗУУРЫН нэвтрэлт — Google холбогдох хүртэл.
 *
 * ⚠️ Энэ зам нууц үг асуухгүй. Хэн ч өөрийгөө эрхлэгч болгож чадна.
 * Тиймээс `DEV_LOGIN_ENABLED=1` тохируулагдсан үед л ажиллана.
 */
export function isDevLoginEnabled(): boolean {
  return process.env.DEV_LOGIN_ENABLED === "1";
}

/** Seed-ийн тестийн сургууль. `scripts/seed.ts`-ийн `SCHOOL_SLUG`-тай ижил. */
const TEST_SCHOOL_SLUG = "zulzaga";

/**
 * ⛔ **Автомат хамгаалалт: зөвхөн ТЕСТИЙН сургууль.**
 *
 * Тугийг гараар унтраахыг мартах нь хамгийн магадлалтай алдаа — пилот
 * сургууль үүсгэчихээд нууц үггүй нэвтрэх жагсаалтад 25 жинхэнэ хүүхдийн
 * нэр гарч ирнэ.
 *
 * Эхэн үед «өөр сургууль үүсмэгц бүгдийг хаах» гэж бичсэн нь хэт хатуу
 * байв: хөгжүүлэлтийн санд хуучин тестээс үлдсэн сургууль байхад л
 * ажиллахаа больсон. Одоогийн дүрэм илүү зөв: **жинхэнэ хүн жагсаалтад
 * хэзээ ч гарахгүй**, тестийн ажил нь тасрахгүй.
 */
export async function devLoginUsable(): Promise<boolean> {
  return isDevLoginEnabled();
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
  if (!(await devLoginUsable())) return [];

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
    // ⛔ Зөвхөн тестийн сургууль. Жинхэнэ хүүхдийн нэр энд гарахгүй.
    .where(and(eq(memberships.status, "ACTIVE"), eq(schools.slug, TEST_SCHOOL_SLUG)))
    .orderBy(asc(memberships.role), asc(users.name));
}

/** Сонгосон мөр бодитоор байгаа эсэхийг батална — форм дангаараа хангалтгүй. */
export async function devAccountExists(
  userId: string,
  schoolId: string,
  role: MembershipRole,
): Promise<boolean> {
  if (!(await devLoginUsable())) return false;

  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(schools, eq(schools.id, memberships.schoolId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.schoolId, schoolId),
        eq(memberships.role, role),
        eq(memberships.status, "ACTIVE"),
        // ⛔ Жагсаалт нуугдсан ч id таамаглаж нэвтрэх замыг мөн хаана.
        eq(schools.slug, TEST_SCHOOL_SLUG),
      ),
    )
    .limit(1);
  return Boolean(row);
}
