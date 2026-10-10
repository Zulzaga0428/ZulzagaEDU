import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { classMembers, classes } from "@/server/db/schema";
import type { Viewer } from "@/server/auth/access";

/**
 * Бага анги (1–5) ба ахлах анги (6–12).
 *
 * Zulzaga (2026-10-10): 1–5-р ангийн өнгөлөг, эрхлүүлсэн дэлгэц том хүүхдэд
 * «хүүхдийн апп» шиг санагдаж нээхээ болино. 6-р ангиас эхлэн үг хэллэг
 * найз шиг энгийн, өнгө тайван, хичээлийн нэр нь тод.
 *
 * Зөвхөн ХАРАГДАХ БАЙДАЛ ялгагдана — үйлдэл, оноо, эрх нэг хэвээр.
 */
export const SENIOR_FROM_GRADE = 6;

export function isSenior(grade: number | null | undefined): boolean {
  return (grade ?? 0) >= SENIOR_FROM_GRADE;
}

/** Сурагчийн идэвхтэй ангийн түвшин. Ангид ороогүй бол `null` — бага ангийнхаар харагдана. */
export async function studentGrade(viewer: Viewer): Promise<number | null> {
  const [row] = await db
    .select({ grade: classes.grade })
    .from(classes)
    .innerJoin(classMembers, eq(classMembers.classId, classes.id))
    .where(
      and(
        eq(classMembers.userId, viewer.userId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);
  return row?.grade ?? null;
}
