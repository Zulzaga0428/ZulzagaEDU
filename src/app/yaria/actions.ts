"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { sendMessage, startThreadForChild } from "@/server/thread/service";

export async function sendMessageAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const threadId = formData.get("threadId");
  const body = formData.get("body");
  if (typeof threadId !== "string" || typeof body !== "string") {
    throw new Error("Дутуу утга.");
  }
  if (body.trim().length === 0) return;

  await sendMessage(viewer, threadId, body);
  revalidatePath(`/yaria/${threadId}`);
  revalidatePath("/yaria");
}

/** Хүүхдийн хуудаснаас яриа эхлүүлэх — байвал түүн рүү нь очно. */
export async function startThreadAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const studentUserId = formData.get("studentUserId");
  if (typeof studentUserId !== "string") throw new Error("Дутуу утга.");

  const threadId = await startThreadForChild(viewer, studentUserId);
  redirect(`/yaria/${threadId}`);
}
