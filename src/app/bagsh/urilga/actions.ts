"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/access";
import QRCode from "qrcode";
import { createParentInvite, decideGuardian } from "@/server/invite/service";
import { addStudent, resetStudentPin } from "@/server/students/service";
import { notifyGuardianApproved } from "@/server/notify/push";

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

  const result = await decideGuardian(viewer, id, decision);

  /*
    Батлагдсаныг эцэг эхэд хэлнэ. Үүнгүйгээр тэд орой хүсэлт илгээгээд,
    багш маргааш өглөө батлаад, эцэг эх нь хэзээ нээхээ мэдэхгүй хүлээнэ.

    Татгалзсан тохиолдолд мэдэгдэхгүй: шалтгааныг апп тайлбарлаж чадахгүй,
    багш өөрөө ярих нь зөв.
  */
  if (result.approved) {
    try {
      await notifyGuardianApproved({
        schoolId: viewer.schoolId,
        parentUserId: result.parentUserId,
        studentName: result.studentName,
      });
    } catch (err) {
      console.error("Эцэг эхэд мэдэгдэхэд алдаа:", err);
    }
  }

  revalidatePath("/bagsh/urilga");
  revalidatePath("/bagsh");
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
