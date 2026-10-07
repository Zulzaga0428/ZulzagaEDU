"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { DAYS, MAX_PERIODS, saveWeek } from "@/server/schedule/service";

/**
 * Хуваарийг бүтнээр нь хадгална.
 *
 * Талбарын нэр `c-<өдөр>-<цаг>` хэлбэртэй. Хоосон утга = тэр цагт хичээл
 * байхгүй. Бүтнээр илгээдэг тул «хассан» гэсэн тусдаа үйлдэл хэрэггүй.
 */
/**
 * ⚠️ `redirect` биш, хариу буцаана (`docs/DECISIONS.md` §24). 2026-10-07-нд
 * хэмжихэд хуваарь **хадгалагддаг** ч хөтөч хөдөлдөггүй байв — багш «үр дүн
 * харагдахгүй» гэж бодно, дээрх «одоо хадгалагдсан» тойм ч шинэчлэгдэхгүй.
 */
export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveWeekAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const viewer = await requireViewer();
  const classId = formData.get("classId");
  if (typeof classId !== "string") {
    return { ok: false, error: "Анги танигдсангүй. Хуудсыг дахин нээнэ үү." };
  }

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
  return { ok: true };
}
