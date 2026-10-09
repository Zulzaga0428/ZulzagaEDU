"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import {
  addTeacher,
  assignTeacher,
  createClass,
  currentAcademicYear,
  resetTeacherPin,
  setHomeroom,
  unassignTeacher,
} from "@/server/school/manage";
import {
  PILOT_AMOUNT_MNT,
  cancelIncentive,
  enrollTeacher,
  markPaid,
} from "@/server/incentive/service";

/** Багш нэмнэ. PIN-ийг буцаана — нэг л удаа харагдана. */
export async function addTeacherAction(
  name: string,
  phone: string,
): Promise<{ name: string; phone: string; pin: string }> {
  const viewer = await requireViewer();
  const res = await addTeacher(viewer, name, phone);
  revalidatePath("/erhlegch/bagsh");
  return res;
}

export async function resetTeacherPinAction(
  teacherUserId: string,
): Promise<{ pin: string }> {
  const viewer = await requireViewer();
  return { pin: await resetTeacherPin(viewer, teacherUserId) };
}

export async function createClassAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const name = formData.get("name");
  const grade = formData.get("grade");
  if (typeof name !== "string" || typeof grade !== "string") throw new Error("Дутуу утга.");

  await createClass(viewer, name, Number(grade), currentAcademicYear());
  revalidatePath("/erhlegch/bagsh");
  revalidatePath("/erhlegch");
}

export async function assignTeacherAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const classId = formData.get("classId");
  const teacherUserId = formData.get("teacherUserId");
  if (typeof classId !== "string" || typeof teacherUserId !== "string" || !teacherUserId) {
    throw new Error("Дутуу утга.");
  }

  await assignTeacher(viewer, classId, teacherUserId);
  revalidatePath("/erhlegch/bagsh");
}

export async function unassignTeacherAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const classId = formData.get("classId");
  const teacherUserId = formData.get("teacherUserId");
  if (typeof classId !== "string" || typeof teacherUserId !== "string") {
    throw new Error("Дутуу утга.");
  }

  await unassignTeacher(viewer, classId, teacherUserId);
  revalidatePath("/erhlegch/bagsh");
}

/**
 * Багшийг энэ сарын пилотын хөлсөнд бүртгэнэ.
 *
 * `docs/DECISIONS.md` §14 — «3 багшид хөлс өгнө, хэнийг оролцуулахыг та
 * шийднэ». Эрхлэгч бүртгэх хүртэл багш мөнгөний тухай юу ч харахгүй.
 */
export async function enrollIncentiveAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const teacherUserId = formData.get("teacherUserId");
  const amount = formData.get("amountMnt");
  if (typeof teacherUserId !== "string") throw new Error("Дутуу утга.");

  const amountMnt =
    typeof amount === "string" && amount !== "" ? Number(amount) : PILOT_AMOUNT_MNT;

  await enrollTeacher(viewer, teacherUserId, amountMnt);
  revalidatePath("/erhlegch/bagsh");
  revalidatePath("/bagsh");
}

/** «Олголоо» гэж тэмдэглэнэ. Мөнгийг апп шилжүүлдэггүй — зөвхөн бүртгэнэ. */
export async function markIncentivePaidAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = formData.get("incentiveId");
  if (typeof id !== "string") throw new Error("Дутуу утга.");

  await markPaid(viewer, id);
  revalidatePath("/erhlegch/bagsh");
  revalidatePath("/bagsh");
}

/** Буруу бүртгэсэн бол цуцална — багшийн картаас алга болно. */
export async function cancelIncentiveAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = formData.get("incentiveId");
  if (typeof id !== "string") throw new Error("Дутуу утга.");

  await cancelIncentive(viewer, id);
  revalidatePath("/erhlegch/bagsh");
  revalidatePath("/bagsh");
}

export type HomeroomResult = { ok: true } | { ok: false; error: string };

/**
 * Анги удирдсан багшийг сонгоно. Хариу буцаана (`docs/DECISIONS.md` §24) —
 * эрхлэгч «болсон уу» гэж эргэлзэхгүй.
 */
export async function setHomeroomAction(
  _prev: HomeroomResult | null,
  formData: FormData,
): Promise<HomeroomResult> {
  const viewer = await requireViewer();
  const classId = formData.get("classId");
  const teacherUserId = formData.get("teacherUserId");
  if (typeof classId !== "string" || typeof teacherUserId !== "string") {
    return { ok: false, error: "Анги танигдсангүй. Хуудсыг дахин нээнэ үү." };
  }
  try {
    await setHomeroom(viewer, classId, teacherUserId === "" ? null : teacherUserId);
    revalidatePath("/erhlegch/bagsh");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Хадгалж чадсангүй." };
  }
}
