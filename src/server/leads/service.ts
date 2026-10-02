import "server-only";
import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { leads } from "@/server/db/schema";

/**
 * Сургуулиудаас ирэх хүсэлт (`docs/DECISIONS.md` §21).
 *
 * ⚠️ Энэ маягт **нэвтрэлтгүй** — хэн ч бөглөж чадна. Тиймээс:
 *  · Талбарын урт хязгаарлагдсан
 *  · Нэг IP-гаас биш, нэг УТАСНААС давтан илгээхийг хязгаарлав (доор)
 *
 * Спам ирвэл админ дэлгэцээс харж, цэвэрлэнэ. Монгол хэл дээрх, нарийн
 * зорилготой хуудас тул ачаалал бага байх магадлалтай — хэт эрт хамгаалалт
 * барьж төвөгтэй болгосонгүй.
 */

export type LeadResult = { ok: true } | { ok: false; reason: string };

export async function submitLead(input: {
  schoolName: string;
  contactName: string;
  phone: string;
  note: string;
}): Promise<LeadResult> {
  const schoolName = input.schoolName.trim().replace(/\s+/g, " ").slice(0, 200);
  const contactName = input.contactName.trim().replace(/\s+/g, " ").slice(0, 120);
  const phone = input.phone.replace(/\s/g, "").slice(0, 20);
  const note = input.note.trim().slice(0, 1000);

  if (schoolName.length < 2) return { ok: false, reason: "Сургуулийн нэрээ бичнэ үү." };
  if (contactName.length < 2) return { ok: false, reason: "Нэрээ бичнэ үү." };
  if (!/^\d{8}$/.test(phone)) {
    return { ok: false, reason: "Утасны дугаараа 8 оронтойгоор бичнэ үү." };
  }

  // Нэг дугаараас өдөрт нэг удаа — давхар дарснаас хамгаална.
  const [recent] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      sql`${leads.phone} = ${phone} and ${leads.createdAt} > now() - interval '1 day'`,
    )
    .limit(1);
  if (recent) return { ok: false, reason: "Хүсэлт аль хэдийн хүлээн авсан. Бид холбогдоно." };

  await db.insert(leads).values({ schoolName, contactName, phone, note: note || null });
  return { ok: true };
}

export type LeadRow = {
  id: string;
  schoolName: string;
  contactName: string;
  phone: string;
  note: string | null;
  handledAt: Date | null;
  createdAt: Date;
};

export async function listLeads(limit = 50): Promise<LeadRow[]> {
  return db.select().from(leads).orderBy(desc(leads.createdAt)).limit(limit);
}

export async function markLeadHandled(id: string): Promise<void> {
  await db.update(leads).set({ handledAt: new Date() }).where(eq(leads.id, id));
}

/** Админы самбарт — хариу өгөөгүй хүсэлтийн тоо. */
export async function unhandledLeadCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leads)
    .where(sql`${leads.handledAt} is null`);
  return row?.n ?? 0;
}

/** Сүүлийн 7 хоногт ирсэн — аяллын явцыг харахад. */
export async function recentLeadCount(): Promise<number> {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leads)
    .where(gte(leads.createdAt, since));
  return row?.n ?? 0;
}
