"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { attachToSubmission, saveImage } from "@/server/files/storage";

/**
 * Дэвтрийн зураг илгээх.
 *
 * Монголын 1–5 ангийн даалгавар цаасан дээр хийгддэг. Дэлгэц рүү оруулах
 * гэж оролдохын оронд зурагдаж илгээх нь бодит байдалд нийцнэ.
 *
 * Зургийг хөтөч дээр жижигрүүлж илгээдэг — утасны 4MB зураг 200KB болно.
 * Монголын мобайл датанд энэ нь ялгаа гаргана.
 */
export async function uploadNotebookPhoto(formData: FormData): Promise<void> {
  const viewer = await requireViewer();

  const homeworkId = formData.get("homeworkId");
  const photo = formData.get("photo");

  if (typeof homeworkId !== "string" || !(photo instanceof File)) {
    throw new Error("Дутуу утга.");
  }

  const bytes = new Uint8Array(await photo.arrayBuffer());
  const { id } = await saveImage(viewer, bytes, photo.type);
  await attachToSubmission(viewer, homeworkId, id);

  revalidatePath("/suragch");
}
