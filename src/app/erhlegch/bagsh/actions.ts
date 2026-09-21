"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import {
  addTeacher,
  assignTeacher,
  createClass,
  currentAcademicYear,
  resetTeacherPin,
  unassignTeacher,
} from "@/server/school/manage";

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
