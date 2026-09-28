import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { pointsLedger, studentAvatars } from "@/server/db/schema";
import { AccessError, type Viewer } from "@/server/auth/access";
import { AVATARS, DEFAULT_AVATAR, avatarDef } from "@/components/avatars";
import { balanceOf, pointsEnabled } from "./service";

/**
 * Аватар нээх, сонгох (`docs/DECISIONS.md` §18).
 *
 * ⚠️ Үнийг **кодоос** уншина, клиентээс ХЭЗЭЭ Ч биш. Эс бөгөөс хүүхэд
 * (эсвэл хэн ч) хүсэлтдээ `cost=0` гэж бичээд бүгдийг үнэгүй авна.
 */

export type AvatarRow = {
  id: string;
  name: string;
  cost: number;
  owned: boolean;
  selected: boolean;
  affordable: boolean;
};

/** Хүүхдийн одоогийн аватар. Сонгоогүй бол үнэгүй анхныхыг. */
export async function selectedAvatar(userId: string): Promise<string> {
  const [row] = await db
    .select({ avatarId: studentAvatars.avatarId })
    .from(studentAvatars)
    .where(and(eq(studentAvatars.userId, userId), eq(studentAvatars.selected, true)))
    .limit(1);
  return row?.avatarId ?? DEFAULT_AVATAR;
}

/** Каталог — юу нээгдсэн, юуг авч чадах вэ. */
export async function avatarCatalog(viewer: Viewer): Promise<AvatarRow[]> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");

  const [owned, balance] = await Promise.all([
    db
      .select({ avatarId: studentAvatars.avatarId, selected: studentAvatars.selected })
      .from(studentAvatars)
      .where(eq(studentAvatars.userId, viewer.userId)),
    balanceOf(viewer.userId),
  ]);

  const mine = new Map(owned.map((o) => [o.avatarId, o.selected]));
  const anySelected = owned.some((o) => o.selected);

  return AVATARS.map((a) => {
    // Үнэгүй аватар нь мөргүй ч гэсэн эзэмшсэнд тооцогдоно.
    const isOwned = a.cost === 0 || mine.has(a.id);
    const isSelected =
      mine.get(a.id) === true || (!anySelected && a.id === DEFAULT_AVATAR);
    return {
      id: a.id,
      name: a.name,
      cost: a.cost,
      owned: isOwned,
      selected: isSelected,
      affordable: balance >= a.cost,
    };
  });
}

/**
 * Аватар худалдаж авна.
 *
 * Оноог `points_ledger`-т сөрөг мөрөөр бичнэ — үлдэгдэл нь дэвтрийн
 * нийлбэр хэвээр, тусад нь хадгалсан тоо байхгүй.
 *
 * ⚠️ Хоёр өөр аватарыг яг нэг агшинд авбал үлдэгдэл сөрөг болох онолын
 * боломж бий (уншаад бичих хоорондох зай). Бодит байдалд 7 настай хүүхэд
 * нэг товчийг хоёр удаа дардаг — түүнийг `unique(userId, avatarId)`
 * бүрэн хаана. Түгжээ нэмбэл энгийн зүйлийг хүндрүүлнэ.
 */
export async function buyAvatar(viewer: Viewer, avatarId: string): Promise<void> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");
  if (!pointsEnabled()) throw new Error("Оноо идэвхгүй байна.");

  const def = AVATARS.find((a) => a.id === avatarId);
  if (!def) throw new Error("Ийм аватар байхгүй.");
  if (def.cost === 0) throw new Error("Энэ аватар үнэгүй.");

  const [already] = await db
    .select({ id: studentAvatars.id })
    .from(studentAvatars)
    .where(and(eq(studentAvatars.userId, viewer.userId), eq(studentAvatars.avatarId, avatarId)))
    .limit(1);
  if (already) throw new Error("Аль хэдийн нээсэн байна.");

  const balance = await balanceOf(viewer.userId);
  if (balance < def.cost) throw new Error("Оноо хүрэхгүй байна.");

  await db.transaction(async (tx) => {
    await tx.insert(pointsLedger).values({
      schoolId: viewer.schoolId,
      userId: viewer.userId,
      points: -def.cost,
      reason: `SPEND:${avatarId}`,
      homeworkId: null,
    });
    await tx.insert(studentAvatars).values({ userId: viewer.userId, avatarId });
  });
}

/** Нээсэн аватараа сонгоно. Нээгээгүйг сонгож болохгүй. */
export async function selectAvatar(viewer: Viewer, avatarId: string): Promise<void> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");

  const def = AVATARS.find((a) => a.id === avatarId);
  if (!def) throw new Error("Ийм аватар байхгүй.");

  if (def.cost > 0) {
    const [owned] = await db
      .select({ id: studentAvatars.id })
      .from(studentAvatars)
      .where(
        and(eq(studentAvatars.userId, viewer.userId), eq(studentAvatars.avatarId, avatarId)),
      )
      .limit(1);
    if (!owned) throw new AccessError("ЭРХГҮЙ");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(studentAvatars)
      .set({ selected: false })
      .where(eq(studentAvatars.userId, viewer.userId));

    await tx
      .insert(studentAvatars)
      .values({ userId: viewer.userId, avatarId, selected: true })
      .onConflictDoUpdate({
        target: [studentAvatars.userId, studentAvatars.avatarId],
        set: { selected: true },
      });
  });
}

/** Харуулахад — нэр, өнгө нь кодоос. */
export function describeAvatar(id: string | null | undefined) {
  return avatarDef(id);
}
