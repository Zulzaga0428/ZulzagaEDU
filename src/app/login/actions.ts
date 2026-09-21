"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/server/auth/session";
import { devAccountExists, isDevLoginEnabled } from "@/server/auth/dev-login";
import { signIn } from "@/server/auth/credentials";
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

/**
 * Жинхэнэ нэвтрэлт — код (сурагч) эсвэл утасны дугаар (насанд хүрэгч) + PIN.
 *
 * Алдааг хаягийн мөрөөр буцаана — форм нь сервер талын энгийн форм хэвээр
 * үлдэж, JavaScript унтарсан ч ажиллана. Муу интернэттэй утсанд чухал.
 */
export async function signInWithPin(formData: FormData): Promise<void> {
  const identifier = formData.get("identifier");
  const pin = formData.get("pin");

  if (typeof identifier !== "string" || typeof pin !== "string") {
    redirect("/login?aldaa=buruu");
  }

  const result = await signIn(identifier, pin);

  if (!result.ok) {
    const code =
      result.reason === "ТҮГЖЭЭТЭЙ"
        ? "tugjeetei"
        : result.reason === "ГИШҮҮНЧЛЭЛГҮЙ"
          ? "gishuunchlelgui"
          : "buruu";
    redirect(`/login?aldaa=${code}`);
  }

  await createSession({
    userId: result.userId,
    schoolId: result.schoolId,
    role: result.role,
  });
  redirect(ROLE_HOME[result.role]);
}
