"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import {
  announcementRecipients,
  deleteAnnouncement,
  postAnnouncement,
  type Audience,
} from "@/server/announce/service";
import { notifyAnnouncement } from "@/server/notify/push";

const AUDIENCES = ["ALL", "PARENTS", "STUDENTS"] as const;

export async function postAnnouncementAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const classId = formData.get("classId");
  const body = formData.get("body");
  const audience = formData.get("audience");
  const className = formData.get("className");

  if (
    typeof classId !== "string" ||
    typeof body !== "string" ||
    typeof audience !== "string" ||
    !(AUDIENCES as readonly string[]).includes(audience)
  ) {
    throw new Error("Дутуу утга.");
  }

  const id = await postAnnouncement(viewer, {
    classId,
    body,
    audience: audience as Audience,
  });

  // Мэдэгдэл бүтэхгүй ч зарлал аль хэдийн хадгалагдсан — үүнээс болж уначихгүй.
  try {
    const { students, parents } = await announcementRecipients(
      viewer.schoolId,
      classId,
      audience as Audience,
    );
    await notifyAnnouncement({
      schoolId: viewer.schoolId,
      announcementId: id,
      body,
      className: typeof className === "string" ? className : null,
      students,
      parents,
    });
  } catch (err) {
    console.error("Зарлалын мэдэгдэл илгээхэд алдаа:", err);
  }

  revalidatePath("/bagsh/zarlal");
  redirect("/bagsh/zarlal?ilgeesen=1");
}

export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = formData.get("announcementId");
  if (typeof id !== "string") throw new Error("Дутуу утга.");

  await deleteAnnouncement(viewer, id);
  revalidatePath("/bagsh/zarlal");
}
