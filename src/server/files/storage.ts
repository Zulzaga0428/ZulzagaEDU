import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  classMembers,
  files,
  homework,
  homeworkAttachments,
  homeworkSubmissions,
  submissionAttachments,
} from "@/server/db/schema";
import {
  AccessError,
  childrenOf,
  guardianSeesClass,
  teachesClass,
  type Viewer,
} from "@/server/auth/access";
import {
  isR2Key,
  newObjectKey,
  objectKeyOf,
  r2Delete,
  r2Enabled,
  r2Put,
  R2_SCHEME,
  signedUrl,
} from "@/server/files/r2";
import { isSchoolImage } from "@/server/school/profile";

/**
 * Файлын хадгалалт.
 *
 * 2026-10-09-нөөс ШИНЭ зураг Cloudflare R2 руу (`./r2.ts`) — R2-ийн түлхүүр
 * тохируулагдсан үед. Түүнээс өмнөх зураг Railway-гийн диск дээрээ үлдэж,
 * ижилхэн уншигдсаар байна. Аль нь хаана байгааг `storageKey` хэлнэ.
 *
 * ⚠️ Файлын зам таамаглахад бэрх ч гэсэн ТЭР НЬ ХАМГААЛАЛТ БИШ. Татах бүрд
 * эрхийг сервер шалгана (`docs/PERMISSIONS.md`).
 */

const ROOT = process.env.UPLOAD_DIR ?? "/data/uploads";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function keyFor(schoolId: string): string {
  const name = randomBytes(16).toString("hex");
  // Сургуулиар салгаж хадгална — устгах, хуулбарлахад амар.
  return join(schoolId, `${name}.bin`);
}

function pathFor(storageKey: string): string {
  const full = resolve(ROOT, storageKey);
  // ../ ашиглан гарахаас сэргийлнэ.
  if (!full.startsWith(resolve(ROOT))) throw new Error("Файлын зам буруу.");
  return full;
}

export type SavedFile = { id: string; sizeBytes: number };

/** Зураг хадгалж `files` мөр үүсгэнэ. */
export async function saveImage(
  viewer: Viewer,
  data: Uint8Array,
  mime: string,
): Promise<SavedFile> {
  if (!ALLOWED.has(mime)) throw new Error("Зөвхөн зураг оруулна уу.");
  if (data.byteLength === 0) throw new Error("Файл хоосон байна.");
  if (data.byteLength > MAX_BYTES) throw new Error("Зураг хэт том байна.");

  /*
    Эхлээд зургаа хадгална, ДАРАА нь мөрөө бичнэ. Эсрэгээрээ бол мөр нь
    байгаа атлаа зураг нь байхгүй «эвдэрсэн зураг» үлдэнэ. Энэ дарааллаар
    хамгийн муу тохиолдол нь хэн ч заадаггүй илүү объект — хор хөнөөлгүй.
  */
  let storageKey: string;
  if (r2Enabled()) {
    const objectKey = newObjectKey(viewer.schoolId, `${randomBytes(16).toString("hex")}.bin`);
    await r2Put(objectKey, data, mime);
    storageKey = `${R2_SCHEME}${objectKey}`;
  } else {
    storageKey = keyFor(viewer.schoolId);
    const full = pathFor(storageKey);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  const [row] = await db
    .insert(files)
    .values({
      schoolId: viewer.schoolId,
      uploaderId: viewer.userId,
      storageKey,
      mime,
      sizeBytes: data.byteLength,
    })
    .returning({ id: files.id });

  return { id: row.id, sizeBytes: data.byteLength };
}

/**
 * Файлыг унших эрхтэй эсэхийг шалгана.
 *
 * Сурагчийн илгээсэн зургийг:
 *   · тэр сурагч өөрөө
 *   · түүний батлагдсан эцэг эх
 *   · тэр ангийн багш
 * харна.
 *
 * ⛔ Эрхлэгч ХАРАХГҮЙ. Түүнд тоо л харагдана, даалгаврын агуулга биш
 * (`docs/PERMISSIONS.md`) — зураг бол агуулгын хамгийн шууд хэлбэр.
 */
/** Энэ файл багшийн самбарын зураг бол аль ангийнх вэ. Биш бол `null`. */
async function boardPhotoClass(fileId: string): Promise<string | null> {
  const [row] = await db
    .select({ classId: homework.classId })
    .from(homeworkAttachments)
    .innerJoin(homework, eq(homework.id, homeworkAttachments.homeworkId))
    .where(eq(homeworkAttachments.fileId, fileId))
    .limit(1);
  return row?.classId ?? null;
}

/**
 * Ангийн нийтийн агуулгыг хэн харах вэ.
 *
 * ⚠️ Эрхлэгч ЭНД ОРОХГҮЙ. `docs/PERMISSIONS.md` — эрхлэгч тоо хардаг,
 * ангийн агуулга хардаггүй. Самбарын зураг нь хүүхдийн зураг биш ч гэсэн
 * энэ шугамыг зөөлрүүлэх шалтгаан болохгүй.
 */
async function seesClassContent(viewer: Viewer, classId: string): Promise<boolean> {
  if (viewer.role === "TEACHER") {
    return teachesClass(viewer.userId, classId, viewer.schoolId);
  }
  if (viewer.role === "STUDENT") {
    return studentInClass(viewer.userId, classId);
  }
  if (viewer.role === "PARENT") {
    return guardianSeesClass(viewer.userId, classId, viewer.schoolId);
  }
  return false;
}

async function canRead(viewer: Viewer, fileId: string): Promise<boolean> {
  const [row] = await db
    .select({
      schoolId: files.schoolId,
      uploaderId: files.uploaderId,
      studentUserId: homeworkSubmissions.studentUserId,
      classId: homework.classId,
    })
    .from(files)
    .leftJoin(submissionAttachments, eq(submissionAttachments.fileId, files.id))
    .leftJoin(
      homeworkSubmissions,
      eq(homeworkSubmissions.id, submissionAttachments.submissionId),
    )
    .leftJoin(homework, eq(homework.id, homeworkSubmissions.homeworkId))
    .where(eq(files.id, fileId))
    .limit(1);

  if (!row) return false;
  if (row.schoolId !== viewer.schoolId) return false;

  // Байршуулсан хүн өөрөө үргэлж харна.
  if (row.uploaderId === viewer.userId) return true;

  /*
    Сургуулийн лого, байрны зураг — тэр сургуулийн БҮХ гишүүнд. Энэ шалгалтгүй
    бол дүрэм доор «даалгаварт хавсрагдаагүй файлыг зөвхөн эзэн нь харна» гэж
    унаж, эрхлэгчээс өөр хэн ч логог харахгүй. Сургууль хоорондын хана дээр
    аль хэдийн шалгагдсан.
  */
  if (await isSchoolImage(viewer.schoolId, fileId)) return true;

  /*
    Багшийн самбарын зураг — ангийн БҮХ хүнд зориулагдсан. Сурагчийн
    дэвтрийн зурагтай эсрэг чиглэлтэй: тэр нь нэг хүүхдийнх тул хувийн,
    энэ нь бүх ангийнх тул нээлттэй. Хоёуланг нь нэг дүрмээр шалгаж
    болохгүй.
  */
  const boardClassId = await boardPhotoClass(fileId);
  if (boardClassId) return seesClassContent(viewer, boardClassId);

  // Даалгаварт хавсрагдаагүй файлыг зөвхөн эзэн нь харна.
  if (!row.studentUserId || !row.classId) return false;

  if (viewer.role === "STUDENT") return row.studentUserId === viewer.userId;

  if (viewer.role === "PARENT") {
    const children = await childrenOf(viewer.userId);
    return children.includes(row.studentUserId);
  }

  if (viewer.role === "TEACHER") {
    return teachesClass(viewer.userId, row.classId, viewer.schoolId);
  }

  return false;
}

/**
 * Зургийг хэрхэн өгөх вэ.
 *
 * Диск дээрх хуучин зургийг байт хэлбэрээр шууд, R2 дээрх шинийг богино
 * хугацааны гарын үсэгтэй холбоосоор — хөтөч R2-оос шууд татна, сервер
 * зургийг дамжуулж ачаалал авахгүй.
 */
export type FileContent =
  | { kind: "bytes"; bytes: Buffer; mime: string }
  | { kind: "redirect"; url: string };

/** R2 холбоосын хугацаа. Хөтчийн кэш үүнээс БОГИНО байх ёстой (`/api/file`). */
export const SIGNED_URL_SECONDS = 3600;

export async function readFileFor(viewer: Viewer, fileId: string): Promise<FileContent> {
  if (!(await canRead(viewer, fileId))) throw new AccessError("ЭРХГҮЙ");

  const [row] = await db
    .select({ storageKey: files.storageKey, mime: files.mime })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!row) throw new AccessError("ЭРХГҮЙ");

  if (isR2Key(row.storageKey)) {
    return {
      kind: "redirect",
      url: await signedUrl(objectKeyOf(row.storageKey), SIGNED_URL_SECONDS),
    };
  }
  return { kind: "bytes", bytes: await readFile(pathFor(row.storageKey)), mime: row.mime };
}

/**
 * Сурагч дэвтрийнхээ зургийг даалгавартаа хавсаргана.
 *
 * Хавсаргахад «хийсэн» гэж тэмдэглэгдэнэ — хүүхэд хоёр үйлдэл хийх
 * шаардлагагүй. Зураг илгээсэн нь хийсэн гэсэн үг.
 */
export async function attachToSubmission(
  viewer: Viewer,
  homeworkId: string,
  fileId: string,
): Promise<void> {
  if (viewer.role !== "STUDENT") throw new AccessError("ЭРХГҮЙ");

  const [sub] = await db
    .select({ id: homeworkSubmissions.id, status: homeworkSubmissions.status })
    .from(homeworkSubmissions)
    .innerJoin(homework, eq(homework.id, homeworkSubmissions.homeworkId))
    .where(
      and(
        eq(homeworkSubmissions.homeworkId, homeworkId),
        eq(homeworkSubmissions.studentUserId, viewer.userId),
        eq(homework.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);
  if (!sub) throw new AccessError("ЭРХГҮЙ");

  await db.transaction(async (tx) => {
    await tx
      .insert(submissionAttachments)
      .values({ submissionId: sub.id, fileId })
      .onConflictDoNothing();

    if (sub.status === "ASSIGNED") {
      await tx
        .update(homeworkSubmissions)
        .set({ status: "DONE", markedDoneAt: new Date() })
        .where(eq(homeworkSubmissions.id, sub.id));
    }
  });
}

/** Тухайн илгээлтэд хавсаргасан зургууд. */
/**
 * Багш самбарынхаа зургийг даалгавартаа хавсаргана.
 *
 * Энэ бол аппын гол зорилго: багш самбар дээр аль хэдийн бичсэн, түүнийг
 * дахин бичих ёсгүй. Хүүхэд хуулахгүй, эцэг эх жинхэнэ самбарыг хардаг.
 */
export async function attachToHomework(
  viewer: Viewer,
  homeworkId: string,
  fileId: string,
): Promise<void> {
  if (viewer.role !== "TEACHER") throw new AccessError("ЭРХГҮЙ");

  const [hw] = await db
    .select({ classId: homework.classId })
    .from(homework)
    .where(and(eq(homework.id, homeworkId), eq(homework.schoolId, viewer.schoolId)))
    .limit(1);
  if (!hw) throw new AccessError("ЭРХГҮЙ");

  if (!(await teachesClass(viewer.userId, hw.classId, viewer.schoolId))) {
    throw new AccessError("ЭРХГҮЙ");
  }

  // Өөр сургуулийн файлыг хавсаргах гарцыг хаана.
  const [file] = await db
    .select({ schoolId: files.schoolId, uploaderId: files.uploaderId })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!file || file.schoolId !== viewer.schoolId || file.uploaderId !== viewer.userId) {
    throw new AccessError("ЭРХГҮЙ");
  }

  await db.insert(homeworkAttachments).values({ homeworkId, fileId }).onConflictDoNothing();
}

/** Даалгаварт хавсрагсан самбарын зургууд. */
export async function homeworkFiles(homeworkId: string): Promise<string[]> {
  const rows = await db
    .select({ fileId: homeworkAttachments.fileId })
    .from(homeworkAttachments)
    .where(eq(homeworkAttachments.homeworkId, homeworkId));
  return rows.map((r) => r.fileId);
}

export async function submissionFiles(submissionId: string): Promise<string[]> {
  const rows = await db
    .select({ fileId: submissionAttachments.fileId })
    .from(submissionAttachments)
    .where(eq(submissionAttachments.submissionId, submissionId));
  return rows.map((r) => r.fileId);
}

/** Сурагчийн тухайн даалгаварт хавсаргасан зургууд. */
export async function myAttachments(
  viewer: Viewer,
  homeworkId: string,
): Promise<string[]> {
  const [sub] = await db
    .select({ id: homeworkSubmissions.id })
    .from(homeworkSubmissions)
    .where(
      and(
        eq(homeworkSubmissions.homeworkId, homeworkId),
        eq(homeworkSubmissions.studentUserId, viewer.userId),
      ),
    )
    .limit(1);
  return sub ? submissionFiles(sub.id) : [];
}

/** Ашиглагдаагүй файлыг устгана — байршуулаад хавсаргаагүй тохиолдол. */
export async function deleteFile(fileId: string): Promise<void> {
  const [row] = await db
    .select({ storageKey: files.storageKey })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  if (!row) return;

  if (isR2Key(row.storageKey)) {
    await r2Delete(objectKeyOf(row.storageKey)).catch(() => {});
  } else {
    await unlink(pathFor(row.storageKey)).catch(() => {});
  }
  await db.delete(files).where(eq(files.id, fileId));
}

/** Ангид сурдаг эсэхийг шалгах туслах — тестэд ашиглана. */
export async function studentInClass(userId: string, classId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.userId, userId),
        eq(classMembers.classId, classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
