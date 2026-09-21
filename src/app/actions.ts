"use server";

import { redirect } from "next/navigation";
import { requireViewer, rolesOf } from "@/server/auth/access";
import { createSession } from "@/server/auth/session";
import { MEMBERSHIP_ROLES, ROLE_HOME, type MembershipRole } from "@/server/auth/roles";

/**
 * Дүр сэлгэх — тэр сургуульд багшилдаг бөгөөд хүүхэд нь тэнд сурдаг хүнд.
 *
 * ⚠️ Хүссэн дүрээ формоор илгээж болно гэдгийг мартаж болохгүй: сонголтыг
 * `rolesOf`-оор өгөгдлийн сангаас батлаж байж сесс шинэчилнэ.
 */
export async function switchRole(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const next = formData.get("role");

  if (typeof next !== "string" || !(MEMBERSHIP_ROLES as readonly string[]).includes(next)) {
    throw new Error("Ийм дүр байхгүй.");
  }
  const role = next as MembershipRole;

  const roles = await rolesOf(viewer.userId, viewer.schoolId);
  if (!roles.includes(role)) {
    throw new Error("Энэ дүрийн эрх алга.");
  }

  await createSession({ userId: viewer.userId, schoolId: viewer.schoolId, role });
  redirect(ROLE_HOME[role]);
}
