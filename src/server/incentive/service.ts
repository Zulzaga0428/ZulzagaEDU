import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLog, memberships, teacherIncentives, users } from "@/server/db/schema";
import { AccessError, isManagerOf, type Viewer } from "@/server/auth/access";
import { todayUb } from "@/server/homework/time";

/**
 * Багшийн пилотын хөлс (`docs/DECISIONS.md` §14).
 *
 * ⚠️ Энд **хэрэглээний ямар ч хэмжүүр байхгүй** бөгөөд байх ч ёсгүй. Хөлс нь
 * долоо хоног бүрийн саналын төлөө. Даалгаврын тоотой холбовол багш нар тоо
 * гүйцээж эхэлнэ, тэгвэл пилотын гол хариулт хуурамч болно.
 *
 * ⚠️ Хэн оролцохыг **эрхлэгч** шийднэ. Мөр үүсээгүй багш юу ч харахгүй —
 * автоматаар бүх багшид мөнгө амлахгүй.
 */

/** Пилотын стандарт дүн. Эрхлэгч өөрчилж болно. */
export const PILOT_AMOUNT_MNT = 50_000;

export type IncentiveStatus = "PENDING" | "PAID" | "CANCELLED";

export type MyIncentive = {
  period: string;
  periodLabel: string;
  amountMnt: number;
  status: IncentiveStatus;
  paidAt: Date | null;
};

/** УБ-гийн цагаар энэ сар, `YYYY-MM`. */
export function currentPeriod(): string {
  return todayUb().slice(0, 7);
}

const MONTHS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

export function periodLabel(period: string): string {
  const month = Number(period.slice(5, 7));
  return MONTHS[month - 1] ?? period;
}

/**
 * Багш өөрийн энэ сарын хөлсийг харна.
 *
 * Мөр байхгүй бол `null` — карт огт гарахгүй. Пилотод оролцоогүй багш
 * мөнгөний тухай юу ч харах ёсгүй.
 */
export async function myIncentive(viewer: Viewer): Promise<MyIncentive | null> {
  if (viewer.role !== "TEACHER") return null;

  const period = currentPeriod();
  const [row] = await db
    .select({
      amountMnt: teacherIncentives.amountMnt,
      status: teacherIncentives.status,
      paidAt: teacherIncentives.paidAt,
    })
    .from(teacherIncentives)
    .where(
      and(
        eq(teacherIncentives.teacherUserId, viewer.userId),
        eq(teacherIncentives.schoolId, viewer.schoolId),
        eq(teacherIncentives.period, period),
      ),
    )
    .limit(1);

  if (!row || row.status === "CANCELLED") return null;

  return {
    period,
    periodLabel: periodLabel(period),
    amountMnt: row.amountMnt,
    status: row.status,
    paidAt: row.paidAt,
  };
}

export type IncentiveRow = {
  id: string;
  teacherUserId: string;
  teacherName: string;
  amountMnt: number;
  status: IncentiveStatus;
  paidAt: Date | null;
};

/** Эрхлэгч энэ сарын бүх хөлсийг харна. */
export async function schoolIncentives(
  viewer: Viewer,
  period = currentPeriod(),
): Promise<IncentiveRow[]> {
  if (!(await isManagerOf(viewer.userId, viewer.schoolId))) throw new AccessError("ЭРХГҮЙ");

  return db
    .select({
      id: teacherIncentives.id,
      teacherUserId: teacherIncentives.teacherUserId,
      teacherName: users.name,
      amountMnt: teacherIncentives.amountMnt,
      status: teacherIncentives.status,
      paidAt: teacherIncentives.paidAt,
    })
    .from(teacherIncentives)
    .innerJoin(users, eq(users.id, teacherIncentives.teacherUserId))
    .where(
      and(
        eq(teacherIncentives.schoolId, viewer.schoolId),
        eq(teacherIncentives.period, period),
      ),
    )
    .orderBy(desc(teacherIncentives.createdAt));
}

/**
 * Эрхлэгч багшийг энэ сарын хөлсөнд бүртгэнэ.
 *
 * Хоёр удаа дарвал давхар мөр үүсэхгүй — сар бүрд нэг мөр гэсэн дүрэм
 * өгөгдлийн санд `unique` индексээр хамгаалагдсан.
 */
export async function enrollTeacher(
  viewer: Viewer,
  teacherUserId: string,
  amountMnt = PILOT_AMOUNT_MNT,
  period = currentPeriod(),
): Promise<void> {
  if (!(await isManagerOf(viewer.userId, viewer.schoolId))) throw new AccessError("ЭРХГҮЙ");
  if (!Number.isInteger(amountMnt) || amountMnt <= 0) throw new Error("Дүн буруу.");

  // Зөвхөн ӨӨРИЙН сургуулийн багшийг — дугаараар нь өөр сургуулийн хүн орохгүй.
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
    .insert(teacherIncentives)
    .values({
      schoolId: viewer.schoolId,
      teacherUserId,
      period,
      amountMnt,
      createdBy: viewer.userId,
    })
    .onConflictDoUpdate({
      target: [teacherIncentives.teacherUserId, teacherIncentives.period],
      // Дахин бүртгэвэл цуцлагдсаныг сэргээнэ, дүнг шинэчилнэ.
      set: { amountMnt, status: "PENDING", schoolId: viewer.schoolId },
    });
}

/** Эрхлэгч «олголоо» гэж тэмдэглэнэ. Мөнгийг апп шилжүүлдэггүй — зөвхөн бүртгэнэ. */
export async function markPaid(viewer: Viewer, incentiveId: string): Promise<void> {
  await setStatus(viewer, incentiveId, "PAID");
}

/** Буруу бүртгэсэн бол цуцална — багшийн картаас алга болно. */
export async function cancelIncentive(viewer: Viewer, incentiveId: string): Promise<void> {
  await setStatus(viewer, incentiveId, "CANCELLED");
}

async function setStatus(
  viewer: Viewer,
  incentiveId: string,
  status: IncentiveStatus,
): Promise<void> {
  if (!(await isManagerOf(viewer.userId, viewer.schoolId))) throw new AccessError("ЭРХГҮЙ");

  const updated = await db
    .update(teacherIncentives)
    .set({ status, paidAt: status === "PAID" ? new Date() : null })
    .where(
      and(
        eq(teacherIncentives.id, incentiveId),
        // ⚠️ Сургуулийн шалгалт энд ЗААВАЛ — id мэдсэн эрхлэгч өөр сургуулийн
        // мөрийг өөрчилж чадах болно.
        eq(teacherIncentives.schoolId, viewer.schoolId),
      ),
    )
    .returning({ id: teacherIncentives.id, teacherUserId: teacherIncentives.teacherUserId });

  if (updated.length === 0) throw new AccessError("ЭРХГҮЙ");

  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: status === "PAID" ? "INCENTIVE_PAID" : "INCENTIVE_CANCELLED",
    targetType: "teacher_incentive",
    targetId: incentiveId,
  });
}
