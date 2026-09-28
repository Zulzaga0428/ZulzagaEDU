"use server";

import { revalidatePath } from "next/cache";
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
export async function uploadNotebookPhoto(formData: FormData): Promise<void> {
  const viewer = await requireViewer();

  const homeworkId = formData.get("homeworkId");
  const photo = formData.get("photo");

  if (typeof homeworkId !== "string" || !(photo instanceof File)) {
    throw new Error("Дутуу утга.");
  }

  // Завсарласан эсэхийг мөр бичихээс өмнө (`points/service.ts`).
  const comeback = await isComingBack(viewer);

  const bytes = new Uint8Array(await photo.arrayBuffer());
  const { id } = await saveImage(viewer, bytes, photo.type);
  await attachToSubmission(viewer, homeworkId, id);

  /*
    Зураг илгээх нь «хийсэн» гэж тэмдэглэдэг тул хоёр оноо хоёулаа очно.
    Хоёулаа ХҮҮХДИЙН үйлдэл — багшийн оролцоо энд ч байхгүй (§18).
  */
  await awardForHomework(viewer, homeworkId, "HOMEWORK_DONE");
  await awardForHomework(viewer, homeworkId, "PHOTO");
  if (comeback) await awardForHomework(viewer, homeworkId, "COMEBACK");

  revalidatePath("/suragch");
}
