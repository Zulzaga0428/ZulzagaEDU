"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { createHomework } from "@/server/homework/service";
import { endOfDayUb } from "@/server/homework/time";

export async function createHomeworkAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();

  const classId = formData.get("classId");
  const subjectId = formData.get("subjectId");
  const title = formData.get("title");
  const description = formData.get("description");
  const dueDate = formData.get("dueDate");

  if (typeof classId !== "string" || typeof title !== "string" || typeof dueDate !== "string") {
    throw new Error("Дутуу утга.");
  }

  // Эрхийг service давхарга өөрөө шалгана — энд зөвхөн хэлбэрийг шалгав.
  await createHomework(viewer, {
    classId,
    subjectId: typeof subjectId === "string" && subjectId !== "" ? subjectId : null,
    title,
    description: typeof description === "string" ? description : null,
    dueAt: endOfDayUb(dueDate),
  });

  revalidatePath("/bagsh");
  redirect("/bagsh");
}
