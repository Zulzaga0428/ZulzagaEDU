import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  auditLog,
  classMembers,
  classes,
  homework,
  memberships,
  schools,
  subjects,
  users,
} from "@/server/db/schema";
import { setAdultCredentials } from "@/server/auth/credentials";
import { generatePin, isWeakPin } from "@/server/auth/pin";
import { DEFAULT_SUBJECTS } from "@/server/school/defaults";

/** Дэд асуулгад хэрэглэх бүтэн баганын нэр — `listSchools`-ийн тайлбарыг үз. */
const SCHOOL_ID = sql.raw('"schools"."id"');

/**
 * Сургууль үүсгэх — АППААС.
 *
 * Өмнө нь `scripts/create-school.ts` ганц зам байсан: Zulzaga-гийн
 * компьютер дээрх терминал. 4 ажилтан Монголд захиралтай уулзаж байхад
 * тэр зам ажиллахгүй — уулзалтын дунд Германд шөнө дунд байгаа хүнийг
 * хүлээж чадахгүй.
 *
 * Логик нь скрипттэйгээ ижил: сургууль + үндсэн хичээлүүд + эрхлэгч.
 * Скриптийг устгаагүй — интернэтгүй үед, эсвэл бөөнөөр үүсгэхэд хэрэгтэй.
 */

export type NewSchoolResult =
  | {
      ok: true;
      schoolId: string;
      /** Эрхлэгч — админы оруулсан лого, зураг түүний нэр дээр бүртгэгдэнэ. */
      managerUserId: string;
      slug: string;
      phone: string;
      pin: string | null;
    }
  | { ok: false; reason: string };

/** Нэрнээс slug санал болгоно. Кирилл үсгийг латинчилна. */
export function suggestSlug(name: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
    и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "u", п: "p",
    р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return name
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function safePin(): string {
  for (let i = 0; i < 20; i++) {
    const pin = generatePin();
    if (!isWeakPin(pin)) return pin;
  }
  return "2748";
}

/**
 * Сургууль + эрхлэгч үүсгэнэ.
 *
 * `who` нь аудитад үлддэг — хуваалцсан кодоор нэвтэрсэн тул хэн хийснийг
 * зөвхөн ингэж мэднэ (`admin/session.ts`).
 */
export async function createSchoolWithManager(
  who: string,
  input: { name: string; slug: string; managerName: string; phone: string },
): Promise<NewSchoolResult> {
  const name = input.name.trim().replace(/\s+/g, " ");
  const slug = input.slug.trim().toLowerCase();
  const managerName = input.managerName.trim().replace(/\s+/g, " ");
  const phone = input.phone.replace(/\s/g, "");

  if (name.length < 2) return { ok: false, reason: "Сургуулийн нэр хэт богино." };
  if (managerName.length < 2) return { ok: false, reason: "Эрхлэгчийн нэр хэт богино." };
  if (!/^\d{8}$/.test(phone)) return { ok: false, reason: "Утасны дугаар 8 оронтой байх ёстой." };
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) {
    return { ok: false, reason: "Богино нэр нь 3–32 тэмдэгт, латин үсэг, тоо, зураас." };
  }
  // ⛔ Seed энэ slug-тай сургуулийг устгаж дахин үүсгэдэг.
  if (slug === "zulzaga") return { ok: false, reason: "«zulzaga» нь тестэд хадгалагдсан." };

  const [taken] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.slug, slug))
    .limit(1);
  if (taken) return { ok: false, reason: `«${slug}» нэртэй сургууль аль хэдийн бий.` };

  // Тэр дугаартай хүн аль хэдийн байвал шинэ PIN өгөхгүй — хуучнаараа нэвтэрнэ.
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  const pin = existing ? null : safePin();

  const created = await db.transaction(async (tx) => {
    const [school] = await tx.insert(schools).values({ name, slug }).returning({ id: schools.id });

    await tx
      .insert(subjects)
      .values(DEFAULT_SUBJECTS.map((s, i) => ({ schoolId: school.id, name: s, sortOrder: i })));

    const userId =
      existing?.id ??
      (
        await tx.insert(users).values({ name: managerName, phone }).returning({ id: users.id })
      )[0].id;

    await tx
      .insert(memberships)
      .values({ userId, schoolId: school.id, role: "ACADEMIC_MANAGER" })
      .onConflictDoNothing();

    await tx.insert(auditLog).values({
      schoolId: school.id,
      actorUserId: null,
      action: "SCHOOL_CREATED",
      targetType: "school",
      targetId: school.id,
      meta: { slug, managerUserId: userId, via: "admin", who },
    });

    return { schoolId: school.id, userId };
  });

  // PIN hash нь удаан (scrypt) тул гүйлгээний гадна.
  if (pin) await setAdultCredentials(created.userId, pin);

  return { ok: true, schoolId: created.schoolId, managerUserId: created.userId, slug, phone, pin };
}

export type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  teachers: number;
  students: number;
  classes: number;
  homework: number;
};

/**
 * Бүх сургууль, тоонуудтай нь.
 *
 * Zulzaga Германаас явцыг шууд харна — хэдэн сургууль нэмэгдсэн, багш нар
 * ажиллаж эхэлсэн эсэх. Утсаар асуух шаардлагагүй.
 *
 * ⚠️ Зөвхөн ТОО. Сурагчийн нэр, даалгаврын агуулга энд ОРОХГҮЙ — админ ч
 * ангийн доторх зүйлийг харах эрхгүй (`PERMISSIONS.md`-ийн эрхлэгчийн дүрэм
 * шиг).
 */
export async function listSchools(): Promise<SchoolRow[]> {
  return db
    .select({
      id: schools.id,
      name: schools.name,
      slug: schools.slug,
      createdAt: schools.createdAt,
      /*
        ⚠️ Дэд асуулгад `${schools.id}` бичвэл drizzle түүнийг `"id"` гэж
        богиноор гаргаж, дэд асуулга дотор ямар хүснэгтийнх нь алдагдана.
        Тиймээс бүтэн нэрээр нь бичив.
      */
      teachers: sql<number>`(
        select count(*)::int from ${memberships} m
        where m.school_id = ${SCHOOL_ID} and m.role = 'TEACHER' and m.status = 'ACTIVE'
      )`,
      students: sql<number>`(
        select count(*)::int from ${classMembers} cm
        join ${classes} c on c.id = cm.class_id
        where c.school_id = ${SCHOOL_ID} and cm.role = 'STUDENT' and cm.status = 'ACTIVE'
      )`,
      classes: sql<number>`(
        select count(*)::int from ${classes} c where c.school_id = ${SCHOOL_ID}
      )`,
      homework: sql<number>`(
        select count(*)::int from ${homework} h where h.school_id = ${SCHOOL_ID}
      )`,
    })
    .from(schools)
    .orderBy(desc(schools.createdAt));
}
