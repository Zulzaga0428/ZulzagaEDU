"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import { markDone, undoDone } from "@/server/homework/service";
import { awardForHomework, isComingBack } from "@/server/points/service";

/**
 * ⚠️ Хариу буцаана (`docs/DECISIONS.md` §24). 2026-10-09-нд хэмжихэд хүүхэд
 * «хийчихлээ» дараад 8 секунд хүлээсэн ч оноо, товч хоёулаа хэвээр байв —
 * хадгалагдсан ч хүүхэд мэдэхгүй. Энэ нь §18-ийн «шагнал ШУУД» гэдгийг
 * бүхэлд нь эвддэг: шагнал хуудас шинэчлэх хүртэл нуугдаж байсан.
 */
export type DoneResult = { ok: true; gained: number } | { ok: false; error: string };

export async function markDoneAction(
  _prev: DoneResult | null,
  formData: FormData,
): Promise<DoneResult> {
  const viewer = await requireViewer();
  const homeworkId = formData.get("homeworkId");
  if (typeof homeworkId !== "string") {
    return { ok: false, error: "Даалгавар олдсонгүй. Дахин оролдоорой." };
  }

  /*
    ⚠️ Завсарласан эсэхийг оноо бичихээс ӨМНӨ шалгана — дараа шалгавал
    дөнгөж бичсэн мөрөө олж «саяхан идэвхтэй байсан» гэж дүгнэнэ.
  */
  const comeback = await isComingBack(viewer);

  await markDone(viewer, homeworkId);

  /*
    Оноо ШУУД — 7 настай хүүхдэд маргааш ирэх шагнал утгагүй. Багшийн
    оролцоо энд байхгүй (`docs/DECISIONS.md` §18).
  */
  let gained = await awardForHomework(viewer, homeworkId, "HOMEWORK_DONE");
  if (comeback) gained += await awardForHomework(viewer, homeworkId, "COMEBACK");

  /*
    ⚠️ Энд `revalidatePath` ЗОРИУД БАЙХГҮЙ. Түүнийг дуудвал Next шинэ хуудсыг
    хариутай нь хамт илгээж, карт «Хийсэн» рүү ТЭР ДОР нүүнэ — товч ч
    түүнтэйгээ алга болж, «+10 оноо!» мөр хэзээ ч зурагдахгүй (2026-10-09-нд
    хэмжиж илрүүлсэн). Хуудас `force-dynamic` тул шинэчлэлтийг товч өөрөө
    шагналыг харуулсны дараа `router.refresh()`-ээр хийнэ.
  */
  return { ok: true, gained };
}

/** Андуурч дарсныг буцаана. Багш шалгасан бол буцаахгүй. */
export type UndoResult = { ok: true } | { ok: false; error: string };

export async function undoDoneAction(
  _prev: UndoResult | null,
  formData: FormData,
): Promise<UndoResult> {
  const viewer = await requireViewer();
  const homeworkId = formData.get("homeworkId");
  if (typeof homeworkId !== "string") {
    return { ok: false, error: "Даалгавар олдсонгүй." };
  }

  await undoDone(viewer, homeworkId);
  revalidatePath("/suragch");
  return { ok: true };
}
