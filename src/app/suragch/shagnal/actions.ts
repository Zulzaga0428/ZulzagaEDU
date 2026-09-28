"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { buyAvatar, selectAvatar } from "@/server/points/avatars";

/**
 * ⚠️ Үнэ клиентээс ИРЭХГҮЙ — зөвхөн аватарын нэр. Үнийг сервер кодоосоо
 * уншина. Эс бөгөөс хүсэлтдээ `cost=0` гэж бичээд бүгдийг үнэгүй авна.
 */
export async function buyAvatarAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const avatarId = formData.get("avatarId");
  if (typeof avatarId !== "string") throw new Error("Дутуу утга.");

  await buyAvatar(viewer, avatarId);
  revalidatePath("/suragch/shagnal");
  revalidatePath("/suragch");
}

export async function selectAvatarAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const avatarId = formData.get("avatarId");
  if (typeof avatarId !== "string") throw new Error("Дутуу утга.");

  await selectAvatar(viewer, avatarId);
  revalidatePath("/suragch/shagnal");
  revalidatePath("/suragch");
}
