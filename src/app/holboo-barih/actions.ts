"use server";

import { submitLead } from "@/server/leads/service";

/**
 * Сургуулийн хүсэлт — **нэвтрэлтгүй**.
 *
 * ⚠️ Энэ бол аппын цорын ганц нээлттэй бичих зам. Тиймээс сервер талд
 * бүх утгыг хэмжиж, таслана (`leads/service.ts`).
 */
export async function submitLeadAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; reason: string } | null> {
  return submitLead({
    schoolName: String(formData.get("schoolName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
}
