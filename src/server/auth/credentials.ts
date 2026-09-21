import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLog, credentials, memberships, users } from "@/server/db/schema";
import { generateLoginCode, hashPin, isWeakPin, verifyPin } from "@/server/auth/pin";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * Код/дугаар + PIN-ээр нэвтрэх.
 *
 * Энэ файл бол Google, SMS, эсвэл өөр арга хожим нэмэгдэхэд солигдох ГАНЦ
 * газар. Дээрх бүх давхарга `users.id`-тай ажилладаг тул хөдлөхгүй.
 */

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type SignInResult =
  | { ok: true; userId: string; schoolId: string; role: MembershipRole }
  | { ok: false; reason: "БУРУУ" | "ТҮГЖЭЭТЭЙ" | "ГИШҮҮНЧЛЭЛГҮЙ" };

/**
 * ⚠️ Буруу код ба буруу PIN хоёрыг ЯЛГААГҮЙ хариулна.
 *
 * «Ийм код байхгүй» гэж хэлбэл халдагч кодыг нэг нэгээр нь шалгаж жинхэнэ
 * хэрэглэгчдийг олох боломжтой болно. Код нь жинхэнэ нууц учраас түүнийг
 * задлах ёсгүй.
 */
export async function signIn(identifier: string, pin: string): Promise<SignInResult> {
  const id = identifier.trim().toUpperCase();

  const [row] = await db
    .select({
      userId: credentials.userId,
      pinHash: credentials.pinHash,
      failedAttempts: credentials.failedAttempts,
      lockedUntil: credentials.lockedUntil,
    })
    .from(credentials)
    .innerJoin(users, eq(users.id, credentials.userId))
    .where(
      sql`upper(${credentials.loginCode}) = ${id} or ${users.phone} = ${identifier.trim()}`,
    )
    .limit(1);

  if (!row) return { ok: false, reason: "БУРУУ" };

  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    return { ok: false, reason: "ТҮГЖЭЭТЭЙ" };
  }

  if (!(await verifyPin(pin, row.pinHash))) {
    const attempts = row.failedAttempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;

    await db
      .update(credentials)
      .set({
        failedAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(credentials.userId, row.userId));

    if (lock) {
      await db.insert(auditLog).values({
        actorUserId: row.userId,
        action: "LOGIN_LOCKED",
        targetType: "user",
        targetId: row.userId,
        meta: { attempts },
      });
      return { ok: false, reason: "ТҮГЖЭЭТЭЙ" };
    }
    return { ok: false, reason: "БУРУУ" };
  }

  const roles = await db
    .select({ schoolId: memberships.schoolId, role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, row.userId), eq(memberships.status, "ACTIVE")));

  if (roles.length === 0) return { ok: false, reason: "ГИШҮҮНЧЛЭЛГҮЙ" };

  /**
   * Нэг хүн олон дүртэй байж болно — тэр сургуульд багшилдаг бөгөөд хүүхэд
   * нь тэнд сурдаг хүн Монголд байнга тохиолдоно.
   *
   * ⚠️ Эхэндээ «хамгийн бага эрхтэйг сонго» гэж бичсэн нь БУРУУ байв: багш
   * дугаараараа нэвтэрмэгц эцэг эхийн дэлгэц рүү унаж, тэнд үйлдэл огт
   * байдаггүй тул «апп ажиллахгүй байна» гэж харагддаг байлаа.
   *
   * Хүний ҮНДСЭН АЖИЛ нь эхэлнэ. Аюулгүй байдлын алдагдал үүсэхгүй —
   * бүх эрхийг сервер мөр мөрөөр нь шалгадаг, сесс дэх дүр нь зөвхөн
   * «аль дэлгэцээс эхлэх вэ» гэдгийг хэлнэ.
   */
  const order: MembershipRole[] = ["ACADEMIC_MANAGER", "TEACHER", "PARENT", "STUDENT"];
  const chosen = [...roles].sort(
    (a, b) => order.indexOf(a.role) - order.indexOf(b.role),
  )[0];

  await db
    .update(credentials)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(credentials.userId, row.userId));

  return { ok: true, userId: row.userId, schoolId: chosen.schoolId, role: chosen.role };
}

/** Сурагчид код + PIN олгоно. Код давхцвал дахин оролдоно. */
export async function issueStudentCredentials(
  userId: string,
  classPrefix: string,
  pin: string,
): Promise<{ loginCode: string }> {
  if (isWeakPin(pin)) throw new Error("PIN хэт амархан таамаглагдана.");
  const pinHash = await hashPin(pin);

  for (let attempt = 0; attempt < 5; attempt++) {
    const loginCode = generateLoginCode(classPrefix);
    try {
      await db
        .insert(credentials)
        .values({ userId, loginCode, pinHash })
        .onConflictDoUpdate({
          target: credentials.userId,
          set: { loginCode, pinHash, failedAttempts: 0, lockedUntil: null },
        });
      return { loginCode };
    } catch {
      // login_code давхцсан — өөр код гаргаж дахин оролдоно.
    }
  }
  throw new Error("Нэвтрэх код үүсгэж чадсангүй.");
}

/** Насанд хүрэгчид дугаар + PIN олгоно. */
export async function setAdultCredentials(userId: string, pin: string): Promise<void> {
  if (isWeakPin(pin)) throw new Error("PIN хэт амархан таамаглагдана.");
  const pinHash = await hashPin(pin);

  await db
    .insert(credentials)
    .values({ userId, pinHash })
    .onConflictDoUpdate({
      target: credentials.userId,
      set: { pinHash, failedAttempts: 0, lockedUntil: null },
    });
}
