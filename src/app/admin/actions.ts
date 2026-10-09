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
import { saveImage } from "@/server/files/storage";
import { cleanProfile, setProfileByAdmin, setSchoolImage } from "@/server/school/profile";
import type { Viewer } from "@/server/auth/access";

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
  | {
      ok: true;
      name: string;
      slug: string;
      phone: string;
      pin: string | null;
      logo: boolean;
      photo: boolean;
      /** Сургууль үүссэн ч зураг хадгалагдаагүй бол — эрхлэгч дараа нь оруулна. */
      note: string | null;
    }
  | { ok: false; reason: string }
  | null
> {
  const admin = await readAdminSession();
  if (!admin) return { ok: false, reason: "Сесс дууссан байна. Дахин нэвтэрнэ үү." };

  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const managerName = String(formData.get("managerName") ?? "");
  const phone = String(formData.get("phone") ?? "");

  /*
    Профайлыг сургууль үүсгэхээс ӨМНӨ шалгана. Буруу холбоос эсвэл буруу
    зураг дараа нь илэрвэл сургууль хагас үүссэн, эрхлэгчийн PIN нь гарсан
    атлаа админд «алдаа» гэж харагдана.
  */
  let profile: ReturnType<typeof cleanProfile>;
  try {
    profile = cleanProfile({
      address: formData.get("address"),
      phone: formData.get("schoolPhone"),
      website: formData.get("website"),
      facebook: formData.get("facebook"),
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Мэдээлэл буруу." };
  }
  const images: { kind: "logo" | "photo"; file: File }[] = [];
  for (const kind of ["logo", "photo"] as const) {
    const f = formData.get(kind);
    if (!(f instanceof File) || f.size === 0) continue;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      return { ok: false, reason: "Лого, зураг нь PNG, JPEG эсвэл WEBP байна." };
    }
    if (f.size > 5 * 1024 * 1024) return { ok: false, reason: "Зураг хэт том (5MB хүртэл)." };
    images.push({ kind, file: f });
  }

  const result = await createSchoolWithManager(admin.who, {
    name,
    slug,
    managerName,
    phone,
  });

  if (!result.ok) return result;

  await setProfileByAdmin(result.schoolId, profile, admin.who);

  /*
    Зураг ЭРХЛЭГЧИЙН нэр дээр бүртгэгдэнэ — админ сургуулийн гишүүн биш.
    Ингэснээр эрхлэгч дараа нь өөрөө солиход эзэмшил нь таарна
    (`setSchoolImage` байршуулагчийг шалгадаг).
  */
  const manager: Viewer = {
    userId: result.managerUserId,
    schoolId: result.schoolId,
    role: "ACADEMIC_MANAGER",
  };
  const saved = { logo: false, photo: false };
  let note: string | null = null;
  for (const { kind, file } of images) {
    try {
      const { id } = await saveImage(manager, new Uint8Array(await file.arrayBuffer()), file.type);
      await setSchoolImage(manager, kind, id);
      saved[kind] = true;
    } catch {
      note = "Сургууль үүссэн, гэхдээ зураг хадгалагдсангүй — эрхлэгч «Манай сургууль» хэсгээс оруулна.";
    }
  }

  revalidatePath("/admin");
  return {
    ok: true,
    name: name.trim(),
    slug: result.slug,
    phone: result.phone,
    pin: result.pin,
    logo: saved.logo,
    photo: saved.photo,
    note,
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
