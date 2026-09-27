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
} from "@/server/homework/service";
import { attachToHomework } from "@/server/files/storage";
import { endOfDayUb } from "@/server/homework/time";
import { notifyChecked, notifyNewHomework } from "@/server/notify/push";

export async function createHomeworkAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();

  const classId = formData.get("classId");
  const subjectId = formData.get("subjectId");
  const rawTitle = formData.get("title");
  const description = formData.get("description");
  const dueDate = formData.get("dueDate");
  const boardFileId = formData.get("boardFileId");

  if (typeof classId !== "string" || typeof rawTitle !== "string" || typeof dueDate !== "string") {
    throw new Error("Дутуу утга.");
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
    if (!board) throw new Error("Гарчиг эсвэл самбарын зураг хэрэгтэй.");
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

  // Мэдэгдэл бүтэхгүй байж болно (зөвшөөрөл өгөөгүй, iPhone дээр дэлгэцэнд
  // нэмээгүй). Даалгавар аль хэдийн үүссэн тул үүнээс болж уначихгүй.
  try {
    const klass = (await myClasses(viewer)).find((c) => c.id === classId);
    await notifyNewHomework({
      schoolId: viewer.schoolId,
      classId,
      homeworkId,
      title,
      className: klass ? `${klass.name} анги` : "Анги",
    });
  } catch (err) {
    console.error("Мэдэгдэл илгээхэд алдаа:", err);
  }

  revalidatePath("/bagsh");
  redirect("/bagsh");
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
