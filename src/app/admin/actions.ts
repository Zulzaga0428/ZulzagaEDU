"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createAdminSession,
  destroyAdminSession,
  readAdminSession,
  secretMatches,
} from "@/server/admin/session";
import { createSchoolWithManager } from "@/server/admin/service";
import { markLeadHandled } from "@/server/leads/service";

export async function adminLoginAction(formData: FormData): Promise<void> {
  const who = String(formData.get("who") ?? "").trim();
  const code = String(formData.get("code") ?? "");

  if (who.length < 2) redirect("/admin?aldaa=ner");
  if (!secretMatches(code)) redirect("/admin?aldaa=kod");

  await createAdminSession(who);
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin");
}

/**
 * Сургууль үүсгэнэ.
 *
 * ⚠️ Эрхлэгчийн PIN нэг л удаа харагдана. Тиймээс үр дүнг URL-ээр биш,
 * дэлгэцэн дээр шууд харуулна — `redirect` хийвэл алга болно.
 */
export async function createSchoolAction(
  _prev: unknown,
  formData: FormData,
): Promise<
  | { ok: true; name: string; slug: string; phone: string; pin: string | null }
  | { ok: false; reason: string }
  | null
> {
  const admin = await readAdminSession();
  if (!admin) return { ok: false, reason: "Сесс дууссан байна. Дахин нэвтэрнэ үү." };

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const managerName = String(formData.get("managerName") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const result = await createSchoolWithManager(admin.who, {
    name,
    slug,
    managerName,
    phone,
  });

  if (!result.ok) return result;

  revalidatePath("/admin");
  return {
    ok: true,
    name: name.trim(),
    slug: result.slug,
    phone: result.phone,
    pin: result.pin,
  };
}

/** Хүсэлтэд хариу өгсөн гэж тэмдэглэнэ. */
export async function markLeadHandledAction(formData: FormData): Promise<void> {
  const admin = await readAdminSession();
  if (!admin) redirect("/admin");

  const id = formData.get("leadId");
  if (typeof id !== "string") throw new Error("Дутуу утга.");

  await markLeadHandled(id);
  revalidatePath("/admin");
}
