"use server";

import { requireViewer } from "@/server/auth/access";
import { saveImage } from "@/server/files/storage";
import { setSchoolImage, updateSchoolProfile } from "@/server/school/profile";

/**
 * Сургуулийн профайлыг хадгалах.
 *
 * Хариу буцаана (`docs/DECISIONS.md` §24) — эрхлэгч «хадгалагдсан уу» гэж
 * эргэлзэж дахин дарах ёсгүй.
 */
export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function saveProfileAction(
  _prev: ProfileResult | null,
  formData: FormData,
): Promise<ProfileResult> {
  const viewer = await requireViewer();
  try {
    await updateSchoolProfile(viewer, {
      address: formData.get("address"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      facebook: formData.get("facebook"),
    });
    return { ok: true };
  } catch (err) {
    // `profile.ts`-ийн шалгалтууд эрхлэгчид ойлгомжтой үгтэй.
    return { ok: false, error: err instanceof Error ? err.message : "Хадгалж чадсангүй." };
  }
}

export type ImageResult = { ok: true; fileId: string } | { ok: false; error: string };

/** Лого эсвэл байрны зураг. Эхлээд хадгалж, ДАРАА нь сургуульд холбоно. */
export async function uploadSchoolImageAction(formData: FormData): Promise<ImageResult> {
  const viewer = await requireViewer();
  const kind = formData.get("kind");
  const photo = formData.get("photo");
  if ((kind !== "logo" && kind !== "photo") || !(photo instanceof File)) {
    return { ok: false, error: "Зураг ирсэнгүй. Дахин сонгоно уу." };
  }
  try {
    const { id } = await saveImage(viewer, new Uint8Array(await photo.arrayBuffer()), photo.type);
    await setSchoolImage(viewer, kind, id);
    return { ok: true, fileId: id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Зураг хадгалж чадсангүй." };
  }
}
