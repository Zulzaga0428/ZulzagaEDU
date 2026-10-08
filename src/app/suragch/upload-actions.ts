"use server";

import { requireViewer } from "@/server/auth/access";
import { attachToSubmission, saveImage } from "@/server/files/storage";
import { awardForHomework, isComingBack } from "@/server/points/service";

/**
 * Дэвтрийн зураг илгээх.
 *
 * Монголын 1–5 ангийн даалгавар цаасан дээр хийгддэг. Дэлгэц рүү оруулах
 * гэж оролдохын оронд зурагдаж илгээх нь бодит байдалд нийцнэ.
 *
 * Зургийг хөтөч дээр жижигрүүлж илгээдэг — утасны 4MB зураг 200KB болно.
 * Монголын мобайл датанд энэ нь ялгаа гаргана.
 */
/**
 * ⚠️ Хариу буцаана (`docs/DECISIONS.md` §18, §24). 2026-10-09-нд хэмжихэд
 * хүүхэд зураг илгээгээд 3 секунд хүлээсэн ч оноо, карт хоёулаа хэвээр байв —
 * илгээсэн эсэхээ мэдэхгүй тул дахин илгээнэ.
 */
export type PhotoResult = { ok: true; gained: number } | { ok: false; error: string };

export async function uploadNotebookPhoto(formData: FormData): Promise<PhotoResult> {
  const viewer = await requireViewer();

  const homeworkId = formData.get("homeworkId");
  const photo = formData.get("photo");

  if (typeof homeworkId !== "string" || !(photo instanceof File)) {
    return { ok: false, error: "Зураг ирсэнгүй. Дахин зурагдаарай." };
  }

  // Завсарласан эсэхийг мөр бичихээс өмнө (`points/service.ts`).
  const comeback = await isComingBack(viewer);

  const bytes = new Uint8Array(await photo.arrayBuffer());
  let id: string;
  try {
    ({ id } = await saveImage(viewer, bytes, photo.type));
  } catch (err) {
    // `saveImage`-ийн шалгалтууд (хэт том, зураг биш) хүүхдэд ойлгомжтой үгтэй.
    return { ok: false, error: err instanceof Error ? err.message : "Зураг хадгалж чадсангүй." };
  }
  await attachToSubmission(viewer, homeworkId, id);

  /*
    Зураг илгээх нь «хийсэн» гэж тэмдэглэдэг тул хоёр оноо хоёулаа очно.
    Хоёулаа ХҮҮХДИЙН үйлдэл — багшийн оролцоо энд ч байхгүй (§18).
  */
  let gained = await awardForHomework(viewer, homeworkId, "HOMEWORK_DONE");
  gained += await awardForHomework(viewer, homeworkId, "PHOTO");
  if (comeback) gained += await awardForHomework(viewer, homeworkId, "COMEBACK");

  // `revalidatePath` зориуд байхгүй — шагналыг харуулсны дараа дэлгэц өөрөө
  // шинэчилнэ (`components/student-done-buttons.tsx`-тэй ижил шалтгаан).
  return { ok: true, gained };
}
