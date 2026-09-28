import "server-only";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { homework, pointsLedger } from "@/server/db/schema";
import { AccessError, childrenOf, type Viewer } from "@/server/auth/access";

/**
 * Хүүхдийн урамшууллын оноо (`docs/DECISIONS.md` §18).
 *
 * ## Хоёр зарчим
 *
 * **1. Зөвхөн хүүхдийн үйлдэл оноо үүсгэнэ.** Багш шалгасан эсэх нөлөөлөхгүй.
 * Шалтгаан: багш 25 дэвтрийг аппаар шалгах нь өдөрт 20–30 минутын нэмэлт
 * ажил бөгөөд тэр дэвтрийг ангидаа аль хэдийн хардаг. Хэрэв оноо багшаас
 * хамаарвал эцэг эх «шалгаач» гэж шахаж, дарамт багш дээр буцаж очно.
 *
 * **2. Шагнал ШУУД ирнэ.** 7 настай хүүхдэд маргааш ирэх шагнал өнөөдрийн
 * үйлдэлтэй холбогдохгүй. Тиймээс «хийсэн» дарахад тэр дор нь.
 *
 * ## Тугаар унтраалттай
 *
 * `POINTS_ENABLED` орчны хувьсагчаар асна. Пилотын эхний 3 долоо хоног
 * унтраалттай — суурь тоог авна. Дараа нь асаана. Хоёрын зөрүү нь «оноо
 * ажилласан уу» гэсэн асуултын цорын ганц үнэн хариу.
 */

/** Даалгавраа хийснээ тэмдэглэхэд. */
export const POINTS_HOMEWORK_DONE = 10;
/**
 * Завсарласны дараа эргэж ирэхэд.
 *
 * Энгийн онооноос ӨНДӨР байх нь санаатай. Онооны систем өөрөө ялгааг
 * гүнзгийрүүлдэг: бүгдийг хийдэг хүүхэд бүх шагналыг авч, хоцорсон нь
 * түгжээтэй зургуудыг хараад цөхөрнө. Гэтэл яг тэр хүүхэд бол энэ аппын
 * хамгийн их хэрэгтэй хүн. Эргэж ирэх нь хамгийн хэцүү алхам — түүнийг
 * хамгийн сайн шагнана.
 */
export const POINTS_COMEBACK = 15;
/** Хэдэн хоног завсарласны дараа «эргэж ирсэн» гэж үзэх вэ. */
const COMEBACK_GAP_DAYS = 2;
/** Дэвтрийнхээ зургийг илгээвэл нэмэлт. Энэ нь ХҮҮХДИЙН үйлдэл. */
export const POINTS_PHOTO = 5;

export function pointsEnabled(): boolean {
  return process.env.POINTS_ENABLED === "1";
}

type Reason = "HOMEWORK_DONE" | "PHOTO" | "COMEBACK";

/**
 * Оноо олгоно.
 *
 * ⚠️ Хугацаа хэтэрсэн даалгаварт оноо БАЙХГҮЙ. Эс бөгөөс хүүхэд хуучин
 * даалгавруудыг дараалан дарж оноо тармуулна. Ажлыг нь үгүйсгэхгүй —
 * «хийсэн» гэж тэмдэглэгдсэн хэвээр, зөвхөн оноо өгөхгүй.
 *
 * Мөр давхардвал чимээгүй өнгөрнө (`onConflictDoNothing`): хүүхэд «хийсэн»
 * → «буцаах» → «хийсэн» гэж дарж оноо нэмэгдүүлж чадахгүй.
 */
export async function awardForHomework(
  viewer: Viewer,
  homeworkId: string,
  reason: Reason,
): Promise<void> {
  if (!pointsEnabled()) return;
  if (viewer.role !== "STUDENT") return;

  const [hw] = await db
    .select({ dueAt: homework.dueAt })
    .from(homework)
    .where(and(eq(homework.id, homeworkId), eq(homework.schoolId, viewer.schoolId)))
    .limit(1);
  if (!hw) return;
  if (hw.dueAt.getTime() < Date.now()) return;

  await db
    .insert(pointsLedger)
    .values({
      schoolId: viewer.schoolId,
      userId: viewer.userId,
      points:
        reason === "PHOTO"
          ? POINTS_PHOTO
          : reason === "COMEBACK"
            ? POINTS_COMEBACK
            : POINTS_HOMEWORK_DONE,
      reason,
      homeworkId,
    })
    .onConflictDoNothing();
}

/**
 * Энэ хүүхэд завсарласны дараа эргэж ирж байна уу.
 *
 * ⚠️ Оноо олгохоос ӨМНӨ дуудна — эс бөгөөс дөнгөж бичсэн мөрөө олж
 * «саяхан идэвхтэй байсан» гэж дүгнэнэ.
 *
 * Анх удаа хийж байгаа хүүхэд эргэж ирсэнд тооцогдохгүй: тэр завсарлаагүй,
 * зүгээр л эхэлж байна.
 */
export async function isComingBack(viewer: Viewer): Promise<boolean> {
  if (!pointsEnabled() || viewer.role !== "STUDENT") return false;

  const [last] = await db
    .select({ createdAt: pointsLedger.createdAt })
    .from(pointsLedger)
    .where(and(eq(pointsLedger.userId, viewer.userId), gt(pointsLedger.points, 0)))
    .orderBy(desc(pointsLedger.createdAt))
    .limit(1);

  if (!last) return false;

  const days = (Date.now() - last.createdAt.getTime()) / 86_400_000;
  return days >= COMEBACK_GAP_DAYS;
}

/** Үлдэгдэл. Дэвтрийн нийлбэр — тусад нь хадгалсан тоо байхгүй. */
export async function balanceOf(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));
  return row?.total ?? 0;
}

/** Сурагч өөрийн оноог харна. */
export async function myPoints(viewer: Viewer): Promise<number> {
  if (viewer.role !== "STUDENT") return 0;
  return balanceOf(viewer.userId);
}

/** Эцэг эх хүүхдийнхээ оноог харна — зөвхөн батлагдсан хүүхдийнхээ. */
export async function childPoints(viewer: Viewer, childUserId: string): Promise<number> {
  if (viewer.role !== "PARENT") throw new AccessError("ЭРХГҮЙ");
  const children = await childrenOf(viewer.userId);
  if (!children.includes(childUserId)) throw new AccessError("ЭРХГҮЙ");
  return balanceOf(childUserId);
}

export type PointEntry = { points: number; reason: string; createdAt: Date };

/** Сүүлийн хөдөлгөөнүүд — «яагаад ийм оноотой вэ» гэдэгт хариулна. */
export async function myHistory(viewer: Viewer, limit = 10): Promise<PointEntry[]> {
  if (viewer.role !== "STUDENT") return [];
  return db
    .select({
      points: pointsLedger.points,
      reason: pointsLedger.reason,
      createdAt: pointsLedger.createdAt,
    })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, viewer.userId))
    .orderBy(desc(pointsLedger.createdAt))
    .limit(limit);
}
