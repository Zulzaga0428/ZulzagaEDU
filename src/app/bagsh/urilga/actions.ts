"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import QRCode from "qrcode";
import { createParentInvite, decideGuardian } from "@/server/invite/service";
import { addStudent, resetStudentPin } from "@/server/students/service";
import { inBackground, notifyGuardianApproved } from "@/server/notify/push";

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

/**
 * ⚠️ Хариу буцаана (`docs/DECISIONS.md` §24). 2026-10-09-нд хэмжихэд багш
 * «Батлах» дараад 9 секунд хүлээсэн ч хүсэлт жагсаалтад хэвээр, товч хэвээр
 * байв — хадгалагдсан ч багш мэдэхгүй. Энэ нь эцэг эхийг ангид нэгтгэх
 * гинжний СҮҮЛИЙН холбоо: тэр хооронд эцэг эх «хүлээж байна» дээр сууж байна.
 */
export type DecideResult = { ok: true; approved: boolean } | { ok: false; error: string };

export async function approveGuardianAction(
  _prev: DecideResult | null,
  formData: FormData,
): Promise<DecideResult> {
  const viewer = await requireViewer();
  const id = formData.get("guardianId");
  const decision = formData.get("decision");
  if (typeof id !== "string" || (decision !== "ACTIVE" && decision !== "REJECTED")) {
    return { ok: false, error: "Хүсэлт танигдсангүй. Хуудсыг дахин нээнэ үү." };
  }

  const result = await decideGuardian(viewer, id, decision);

  /*
    Батлагдсаныг эцэг эхэд хэлнэ. Үүнгүйгээр тэд орой хүсэлт илгээгээд,
    багш маргааш өглөө батлаад, эцэг эх нь хэзээ нээхээ мэдэхгүй хүлээнэ.

    Татгалзсан тохиолдолд мэдэгдэхгүй: шалтгааныг апп тайлбарлаж чадахгүй,
    багш өөрөө ярих нь зөв.
  */
  if (result.approved) {
    // Багшийн хүлээлтийн ард — `inBackground` (§24).
    inBackground(
      notifyGuardianApproved({
        schoolId: viewer.schoolId,
        parentUserId: result.parentUserId,
        studentName: result.studentName,
      }),
      "эцэг эх батлагдсан",
    );
  }

  /*
    `revalidatePath` зориуд байхгүй: дуудвал хүсэлтийн карт хариутай зэрэг
    алга болж, багш «баталсан уу, татгалзсан уу» гэдгээ харахгүй үлддэг
    (2026-10-09-нд хэмжсэн). Хуудас `force-dynamic` тул товч өөрөө хариугаа
    үзүүлсний дараа шинэчилнэ.
  */
  return { ok: true, approved: result.approved };
}

/**
 * Шинэ сурагч нэмнэ. Код ба PIN-ийг буцаана — **нэг л удаа харагдана**.
 */
export async function addStudentAction(
  classId: string,
  name: string,
): Promise<{ loginCode: string; pin: string; name: string }> {
  const viewer = await requireViewer();
  const created = await addStudent(viewer, classId, name);
  revalidatePath("/bagsh/urilga");
  return created;
}

/** PIN мартсан сурагчид шинийг өгнө. Код нь хэвээр үлдэнэ. */
export async function resetPinAction(
  studentUserId: string,
): Promise<{ loginCode: string; pin: string; name: string }> {
  const viewer = await requireViewer();
  const res = await resetStudentPin(viewer, studentUserId);
  revalidatePath("/bagsh/urilga");
  return res;
}
