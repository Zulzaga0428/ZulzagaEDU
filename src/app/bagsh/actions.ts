"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import {
  checkAllDone,
  checkSubmission,
  createHomework,
  deleteHomework,
  myClasses,
  schoolSubjects,
  updateHomework,
} from "@/server/homework/service";
import { attachToHomework } from "@/server/files/storage";
import { endOfDayUb } from "@/server/homework/time";
import { inBackground, notifyChecked, notifyNewHomework } from "@/server/notify/push";

/**
 * Даалгавар үүсгэсний хариу.
 *
 * ⚠️ Яагаад `redirect` биш, хариу буцаадаг вэ (`docs/DECISIONS.md` §24):
 * 2026-10-07-нд жинхэнэ хөтчөөр хэмжихэд энэ үйлдэл **даалгаврыг үүсгээд**
 * эргүүлэлт нь хөтчийг хөдөлгөдөггүй байв — багш маягтан дээрээ бөглөөстэй
 * хэвээр үлдэж, «болоогүй юм байна» гэж бодоод дахин дарж, ХОЁР ижил
 * даалгавар үүсгэдэг. Хуучин кодоор, цонхтой хөтчөөр хоёр удаа батлагдсан.
 *
 * Одоо бүтсэн эсэхийг ил буцаана. Хуудас сольж, нооргийг цэвэрлэж, товчийг
 * хаахыг клиент тал шийднэ — чимээгүй бүтэлгүйтэл үлдэхгүй.
 */
export type CreateResult = { ok: true } | { ok: false; error: string };

export async function createHomeworkAction(
  _prev: CreateResult | null,
  formData: FormData,
): Promise<CreateResult> {
  const viewer = await requireViewer();

  const classId = formData.get("classId");
  const subjectId = formData.get("subjectId");
  const rawTitle = formData.get("title");
  const description = formData.get("description");
  const dueDate = formData.get("dueDate");
  const boardFileId = formData.get("boardFileId");

  if (typeof classId !== "string" || typeof rawTitle !== "string" || typeof dueDate !== "string") {
    return { ok: false, error: "Дутуу утга байна. Хуудсыг дахин нээгээд оролдоно уу." };
  }

  const subject = typeof subjectId === "string" && subjectId !== "" ? subjectId : null;
  const board = typeof boardFileId === "string" && boardFileId !== "" ? boardFileId : null;

  /*
    Самбараа зурагдсан багшаас гарчиг нэхэхгүй. Зураг өөрөө даалгавар —
    дахин бичүүлэх нь яг тэр давхар ажил (`docs/DECISIONS.md` §16). Гарчиг
    хоосон бол хичээлийнхээ нэрээр нэрлэнэ.
  */
  let title = rawTitle.trim();
  if (title.length === 0) {
    if (!board) return { ok: false, error: "Юу хийхийг бич, эсвэл самбараа зурагдаарай." };
    const name = subject
      ? (await schoolSubjects(viewer)).find((s) => s.id === subject)?.name
      : null;
    title = name ?? "Гэрийн даалгавар";
  }

  // Эрхийг service давхарга өөрөө шалгана — энд зөвхөн хэлбэрийг шалгав.
  const homeworkId = await createHomework(viewer, {
    classId,
    subjectId: subject,
    title,
    description: typeof description === "string" ? description : null,
    dueAt: endOfDayUb(dueDate),
  });

  if (board) {
    await attachToHomework(viewer, homeworkId, board);
  }

  // Мэдэгдэл нь багшийн хүлээлтийн ард — §24-ийн хэмжилт. Бүтэхгүй байж
  // болно (зөвшөөрөл өгөөгүй, iPhone дээр дэлгэцэнд нэмээгүй).
  const klass = (await myClasses(viewer)).find((c) => c.id === classId);
  inBackground(
    notifyNewHomework({
      schoolId: viewer.schoolId,
      classId,
      homeworkId,
      title,
      className: klass ? `${klass.name} анги` : "Анги",
    }),
    "шинэ даалгавар",
  );

  revalidatePath("/bagsh");
  // Энэ мөрт хүрсэн гэдэг нь даалгавар DB-д орсон гэсэн үг — ноорог
  // цэвэрлэх, хуудас солих эрхийг зөвхөн энэ хариу өгнө.
  return { ok: true };
}

export async function checkSubmissionAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const homeworkId = formData.get("homeworkId");
  const submissionId = formData.get("submissionId");
  const note = formData.get("note");

  if (typeof homeworkId !== "string" || typeof submissionId !== "string") {
    throw new Error("Дутуу утга.");
  }

  const studentUserId = formData.get("studentUserId");
  const title = formData.get("title");

  await checkSubmission(
    viewer,
    homeworkId,
    submissionId,
    typeof note === "string" ? note : null,
  );

  // «Багш харлаа» гэдэг нь хүүхдийн хувьд шагнал — чимээгүй өнгөрвөл
  // тэмдэглэхээ болино. Мэдэгдэл бүтэхгүй ч шалгалт нь аль хэдийн хадгалагдсан.
  if (typeof studentUserId === "string" && typeof title === "string") {
    try {
      await notifyChecked({
        schoolId: viewer.schoolId,
        studentUserId,
        homeworkId,
        title,
        note: typeof note === "string" && note.trim() ? note.trim() : null,
      });
    } catch (err) {
      console.error("Шалгасан мэдэгдэл илгээхэд алдаа:", err);
    }
  }

  revalidatePath(`/bagsh/daalgavar/${homeworkId}`);
}

export async function checkAllDoneAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const homeworkId = formData.get("homeworkId");
  if (typeof homeworkId !== "string") throw new Error("Дутуу утга.");

  await checkAllDone(viewer, homeworkId);
  revalidatePath(`/bagsh/daalgavar/${homeworkId}`);
}

export async function deleteHomeworkAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const homeworkId = formData.get("homeworkId");
  if (typeof homeworkId !== "string") throw new Error("Дутуу утга.");

  await deleteHomework(viewer, homeworkId);
  revalidatePath("/bagsh");
  redirect("/bagsh");
}

/**
 * Даалгаврыг засна.
 *
 * Устгаад дахин үүсгэх нь сурагчдын «хийсэн» тэмдэг, дэвтрийн зургийг
 * бүгдийг устгана. Багш нэг үсэг андуурсны төлөө тэгэх учир алга.
 */
export async function updateHomeworkAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();

  const homeworkId = formData.get("homeworkId");
  const title = formData.get("title");
  const description = formData.get("description");
  const subjectId = formData.get("subjectId");
  const dueDate = formData.get("dueDate");

  if (
    typeof homeworkId !== "string" ||
    typeof title !== "string" ||
    typeof dueDate !== "string"
  ) {
    throw new Error("Дутуу утга.");
  }

  await updateHomework(viewer, homeworkId, {
    title,
    description: typeof description === "string" ? description : null,
    subjectId: typeof subjectId === "string" && subjectId !== "" ? subjectId : null,
    dueAt: endOfDayUb(dueDate),
  });

  revalidatePath(`/bagsh/daalgavar/${homeworkId}`);
  revalidatePath("/bagsh");
  redirect(`/bagsh/daalgavar/${homeworkId}`);
}
