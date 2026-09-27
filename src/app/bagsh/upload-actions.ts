"use server";

import { requireViewer } from "@/server/auth/access";
import { AccessError } from "@/server/auth/access";
import { saveImage } from "@/server/files/storage";

/**
 * Самбарын зургийг ДААЛГАВАР ҮҮСЭХЭЭС ӨМНӨ байршуулна.
 *
 * Сурагчийн урсгалаас ялгаатай нь энд даалгавар хараахан байхгүй — багш
 * зургаа сонгоод, дараа нь формоо илгээдэг. Тиймээс эхлээд файл болгож
 * хадгалаад, түүний `id`-г формд нуулт талбараар буцаана.
 *
 * Хавсаргаагүй файл зөвхөн байршуулсан хүнд харагддаг (`storage.ts`-ийн
 * `canRead`), тул багш формоо илгээхгүй орхивол задгай файл үлдэх ч хэн ч
 * харахгүй.
 */
export async function uploadBoardPhoto(formData: FormData): Promise<{ fileId: string }> {
  const viewer = await requireViewer();
  if (viewer.role !== "TEACHER") throw new AccessError("ЭРХГҮЙ");

  const photo = formData.get("photo");
  if (!(photo instanceof File)) throw new Error("Зураг алга.");

  const saved = await saveImage(
    viewer,
    new Uint8Array(await photo.arrayBuffer()),
    photo.type || "image/jpeg",
  );

  return { fileId: saved.id };
}
