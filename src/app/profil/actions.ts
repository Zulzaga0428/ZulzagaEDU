"use server";

import { redirect } from "next/navigation";
import { requireViewer } from "@/server/auth/access";
import { changeOwnPin } from "@/server/profile/service";

/**
 * PIN солих.
 *
 * Үр дүнг URL-ээр буцаана — хэрэглэгч дахин ачаалахад форм дахин илгээгдэхгүй.
 * ⚠️ Алдааны мессежийг хэзээ ч PIN-тэй хамт буцаахгүй.
 */
export async function changePinAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  const result = await changeOwnPin(viewer, current, next);

  redirect(result.ok ? "/profil?pin=solison" : `/profil?aldaa=${result.reason}`);
}
