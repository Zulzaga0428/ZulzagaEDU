"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { sendMessage, startThreadForChild } from "@/server/thread/service";
import { notifyThreadMessage } from "@/server/notify/push";

export async function sendMessageAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const threadId = formData.get("threadId");
  const body = formData.get("body");
  if (typeof threadId !== "string" || typeof body !== "string") {
    throw new Error("Дутуу утга.");
  }
  if (body.trim().length === 0) return;

  const sent = await sendMessage(viewer, threadId, body);

  /*
    Мэдэгдэлгүй бол яриа утгагүй: эцэг эх «Болд өвчтэй» гэж бичихэд багш
    аппаа нээх хүртэл мэдэхгүй. Багш руу цагт нэг удаа түлхдэг (§17).
    Илгээлт унавал мессеж аль хэдийн хадгалагдсан тул үйлдлийг унагаахгүй.
  */
  try {
    await notifyThreadMessage({
      schoolId: viewer.schoolId,
      threadId: sent.threadId,
      classId: sent.classId,
      studentUserId: sent.studentUserId,
      studentName: sent.studentName,
      authorUserId: viewer.userId,
      preview: sent.preview,
    });
  } catch (err) {
    console.error("Ярианы мэдэгдэл илгээхэд алдаа:", err);
  }

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
