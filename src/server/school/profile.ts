import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLog, files, schools } from "@/server/db/schema";
import { AccessError, type Viewer } from "@/server/auth/access";

/**
 * Сургуулийн профайл — лого, зураг, хаяг, утас, вэб сайт, сошиал.
 *
 * Zulzaga (2026-10-09): сургууль бүр аппыг «өөрийн» гэж мэдрэх ёстой.
 * Бүх талбар заавал БИШ — хоосон профайлтай сургууль ч хэвийн ажиллана.
 *
 * Засах эрх зөвхөн ЭРХЛЭГЧИД. Харах эрх тэр сургуулийн бүх гишүүнд.
 */

export type SchoolProfile = {
  name: string;
  logoFileId: string | null;
  photoFileId: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  facebook: string | null;
};

export async function schoolProfile(schoolId: string): Promise<SchoolProfile | null> {
  const [row] = await db
    .select({
      name: schools.name,
      logoFileId: schools.logoFileId,
      photoFileId: schools.photoFileId,
      address: schools.address,
      phone: schools.phone,
      website: schools.website,
      facebook: schools.facebook,
    })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  return row ?? null;
}

/** Хоосон бол `null`, эс бөгөөс тайрч уртыг хязгаарлана. */
function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/\s+/g, " ");
  if (v.length === 0) return null;
  if (v.length > max) throw new Error(`${max} тэмдэгтээс урт байж болохгүй.`);
  return v;
}

/**
 * Холбоосыг шалгана.
 *
 * ⚠️ Зөвхөн `http`, `https`. Энэ утга `<a href>` болж бүх багш, эцэг эхэд
 * харагдана — `javascript:` гэх мэтийг зөвшөөрвөл дарсан хүний хөтөч дээр
 * хортой код ажиллана. «www.school.mn» гэж бичсэнийг `https://` нэмж засна —
 * эрхлэгч протокол гэж юу болохыг мэдэх албагүй.
 */
export function cleanLink(value: unknown, label: string): string | null {
  const raw = text(value, 300);
  if (raw === null) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`${label} буруу байна.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} нь http эсвэл https-ээр эхлэх ёстой.`);
  }
  if (!url.hostname.includes(".")) throw new Error(`${label} буруу байна.`);
  return url.toString();
}

/** Утас — тоо, зай, «+», «-» л. Монгол дугаар, олон дугаар таслалаар. */
function cleanPhone(value: unknown): string | null {
  const v = text(value, 60);
  if (v === null) return null;
  if (!/^[0-9+\-\s,()]+$/.test(v)) throw new Error("Утасны дугаарт зөвхөн тоо байна.");
  return v;
}

export type ProfileInput = {
  address?: unknown;
  phone?: unknown;
  website?: unknown;
  facebook?: unknown;
};

/** Бичвэрийн талбаруудыг цэвэрлэнэ. Админ ба эрхлэгч хоёулаа үүгээр дамжина. */
export function cleanProfile(input: ProfileInput) {
  return {
    address: text(input.address, 300),
    phone: cleanPhone(input.phone),
    website: cleanLink(input.website, "Вэб сайтын холбоос"),
    facebook: cleanLink(input.facebook, "Сошиал хуудасны холбоос"),
  };
}

export async function updateSchoolProfile(viewer: Viewer, input: ProfileInput): Promise<void> {
  if (viewer.role !== "ACADEMIC_MANAGER") throw new AccessError("ЭРХГҮЙ");
  const clean = cleanProfile(input);

  await db.update(schools).set(clean).where(eq(schools.id, viewer.schoolId));
  await db.insert(auditLog).values({
    schoolId: viewer.schoolId,
    actorUserId: viewer.userId,
    action: "SCHOOL_PROFILE_UPDATED",
    targetType: "school",
    targetId: viewer.schoolId,
    meta: { fields: Object.keys(clean).filter((k) => clean[k as keyof typeof clean] !== null) },
  });
}

/**
 * Лого эсвэл байрны зургийг солино.
 *
 * Файл нь энэ сургуулийнх, ЭНЭ эрхлэгчийн өөрөө байршуулсан байх ёстой —
 * эс бөгөөс өөр сургуулийн, эсвэл хүүхдийн дэвтрийн зургийг лого болгох зам
 * нээгдэнэ. Лого нь сургуулийн бүх гишүүнд харагддаг тул энэ нь чухал.
 */
export async function setSchoolImage(
  viewer: Viewer,
  kind: "logo" | "photo",
  fileId: string,
): Promise<void> {
  if (viewer.role !== "ACADEMIC_MANAGER") throw new AccessError("ЭРХГҮЙ");

  const [file] = await db
    .select({ schoolId: files.schoolId, uploaderId: files.uploaderId })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!file || file.schoolId !== viewer.schoolId || file.uploaderId !== viewer.userId) {
    throw new AccessError("ЭРХГҮЙ");
  }

  await db
    .update(schools)
    .set(kind === "logo" ? { logoFileId: fileId } : { photoFileId: fileId })
    .where(eq(schools.id, viewer.schoolId));
}

/** Энэ файл сургуулийн лого эсвэл байрны зураг мөн эсэх — `files/storage.ts` эрх шалгахад. */
export async function isSchoolImage(schoolId: string, fileId: string): Promise<boolean> {
  const p = await schoolProfile(schoolId);
  return p !== null && (p.logoFileId === fileId || p.photoFileId === fileId);
}
