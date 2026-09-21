"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { DAYS, MAX_PERIODS, saveWeek } from "@/server/schedule/service";

/**
 * Хуваарийг бүтнээр нь хадгална.
 *
 * Талбарын нэр `c-<өдөр>-<цаг>` хэлбэртэй. Хоосон утга = тэр цагт хичээл
 * байхгүй. Бүтнээр илгээдэг тул «хассан» гэсэн тусдаа үйлдэл хэрэггүй.
 */
export async function saveWeekAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const classId = formData.get("classId");
  if (typeof classId !== "string") throw new Error("Дутуу утга.");

  const cells: { dayOfWeek: number; period: number; subjectId: string | null }[] = [];
  for (let day = 1; day <= DAYS.length; day++) {
    for (let period = 1; period <= MAX_PERIODS; period++) {
      const value = formData.get(`c-${day}-${period}`);
      if (typeof value === "string" && value !== "") {
        cells.push({ dayOfWeek: day, period, subjectId: value });
      }
    }
  }

  await saveWeek(viewer, classId, cells);
  revalidatePath("/bagsh/hovaari");
  redirect("/bagsh/hovaari?hadgalsan=1");
}
