"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { sendMessage, startThreadForChild } from "@/server/thread/service";
import { inBackground, notifyThreadMessage } from "@/server/notify/push";

/**
 * ⚠️ Хариу буцаана (`docs/DECISIONS.md` §24). 2026-10-08-нд жинхэнэ хөтчөөр
 * хэмжихэд мессеж **хадгалагддаг** ч ярианд гарч ирдэггүй, бичсэн текст
 * талбарт үлддэг байв. Багш дахин бичнэ (эцэг эхэд хоёр ижил мессеж), эсвэл
 * бууж өгөөд Messenger рүү буцна — §17-ийн бүх зорилго тэндээс унана.
 */
export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendMessageAction(
  _prev: SendResult | null,
  formData: FormData,
): Promise<SendResult> {
  const viewer = await requireViewer();
  const threadId = formData.get("threadId");
  const body = formData.get("body");
  if (typeof threadId !== "string" || typeof body !== "string") {
    return { ok: false, error: "Яриа танигдсангүй. Хуудсыг дахин нээнэ үү." };
  }
  if (body.trim().length === 0) return { ok: false, error: "Мессеж хоосон байна." };

  const sent = await sendMessage(viewer, threadId, body);

  /*
    Мэдэгдэлгүй бол яриа утгагүй: эцэг эх «Болд өвчтэй» гэж бичихэд багш
    аппаа нээх хүртэл мэдэхгүй. Багш руу цагт нэг удаа түлхдэг (§17).
    Илгээлт унавал мессеж аль хэдийн хадгалагдсан тул үйлдлийг унагаахгүй.
  */
  inBackground(
    notifyThreadMessage({
      schoolId: viewer.schoolId,
      threadId: sent.threadId,
      classId: sent.classId,
      studentUserId: sent.studentUserId,
      studentName: sent.studentName,
      authorUserId: viewer.userId,
      preview: sent.preview,
    }),
    "ярианы мессеж",
  );

  revalidatePath(`/yaria/${threadId}`);
  revalidatePath("/yaria");
  return { ok: true };
}

/** Хүүхдийн хуудаснаас яриа эхлүүлэх — байвал түүн рүү нь очно. */
export async function startThreadAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const studentUserId = formData.get("studentUserId");
  if (typeof studentUserId !== "string") throw new Error("Дутуу утга.");

  const threadId = await startThreadForChild(viewer, studentUserId);
  redirect(`/yaria/${threadId}`);
}
