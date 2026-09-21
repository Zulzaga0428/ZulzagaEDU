"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/server/auth/session";
import { devAccountExists, isDevLoginEnabled } from "@/server/auth/dev-login";
import { MEMBERSHIP_ROLES, ROLE_HOME, type MembershipRole } from "@/server/auth/roles";

function isRole(value: unknown): value is MembershipRole {
  return typeof value === "string" && (MEMBERSHIP_ROLES as readonly string[]).includes(value);
}

/**
 * Түр зуурын нэвтрэлт. Google орох үед энэ функц устаж, оронд нь OAuth-ийн
 * callback `createSession`-ийг дуудна. Доод давхаргад юу ч өөрчлөгдөхгүй.
 */
export async function signInAs(formData: FormData): Promise<void> {
  if (!isDevLoginEnabled()) {
    throw new Error("Түр нэвтрэлт идэвхгүй байна.");
  }

  const userId = formData.get("userId");
  const schoolId = formData.get("schoolId");
  const role = formData.get("role");

  if (typeof userId !== "string" || typeof schoolId !== "string" || !isRole(role)) {
    throw new Error("Дутуу утга.");
  }

  // Формоос ирсэн гурвалыг өгөгдлийн сангаас дахин батална — формд юу ч
  // бичиж болно гэдгийг мартаж болохгүй.
  if (!(await devAccountExists(userId, schoolId, role))) {
    throw new Error("Ийм гишүүнчлэл олдсонгүй.");
  }

  await createSession({ userId, schoolId, role });
  redirect(ROLE_HOME[role]);
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
