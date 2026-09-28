"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { markDone, undoDone } from "@/server/homework/service";
import { awardForHomework } from "@/server/points/service";

export async function markDoneAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const homeworkId = formData.get("homeworkId");
  if (typeof homeworkId !== "string") throw new Error("Дутуу утга.");

  await markDone(viewer, homeworkId);

  /*
    Оноо ШУУД — 7 настай хүүхдэд маргааш ирэх шагнал утгагүй. Багшийн
    оролцоо энд байхгүй (`docs/DECISIONS.md` §18).
  */
  await awardForHomework(viewer, homeworkId, "HOMEWORK_DONE");
  revalidatePath("/suragch");
}

/** Андуурч дарсныг буцаана. Багш шалгасан бол буцаахгүй. */
export async function undoDoneAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const homeworkId = formData.get("homeworkId");
  if (typeof homeworkId !== "string") throw new Error("Дутуу утга.");

  await undoDone(viewer, homeworkId);
  revalidatePath("/suragch");
}
