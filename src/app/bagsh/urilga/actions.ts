"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import QRCode from "qrcode";
import { createParentInvite, decideGuardian } from "@/server/invite/service";

/**
 * Урилгын линк ба QR-ыг үүсгэнэ.
 *
 * ⚠️ QR-ыг СЕРВЕР дээрээ зурна. Гадны QR үйлчилгээ ашиглавал урилгын токен
 * гуравдагч тал руу явна — хүүхдийн ангид хүрэх түлхүүрийг өөр компанид
 * өгч байгаатай ижил.
 */
export async function makeParentInvite(
  classId: string,
  studentUserId: string,
): Promise<{ path: string; svg: string; expiresAt: string }> {
  const viewer = await requireViewer();
  const { token, expiresAt } = await createParentInvite(viewer, classId, studentUserId);

  const base = process.env.APP_URL ?? "";
  const path = `/join/${token}`;
  const svg = await QRCode.toString(`${base}${path}`, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#12263f", light: "#ffffff" },
  });

  return { path, svg, expiresAt: expiresAt.toISOString() };
}

export async function approveGuardianAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = formData.get("guardianId");
  const decision = formData.get("decision");
  if (typeof id !== "string" || (decision !== "ACTIVE" && decision !== "REJECTED")) {
    throw new Error("Дутуу утга.");
  }

  await decideGuardian(viewer, id, decision);
  revalidatePath("/bagsh/urilga");
  revalidatePath("/bagsh");
}
