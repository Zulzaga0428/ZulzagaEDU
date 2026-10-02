import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/**
 * Админы сесс — сургуулиас ХАМААРАХГҮЙ.
 *
 * Яагаад тусдаа вэ: `zedu_session` нь үргэлж нэг сургуульд хамаарна
 * (`{userId, schoolId, role}`). Админ бол аль ч сургуульд харьяалагдахгүй —
 * тэр сургуулиудыг ҮҮСГЭДЭГ хүн. Түүнийг хуучин сесс рүү шахах гэвэл
 * зохиомол «дотоод сургууль» үүсгэх хэрэг болно.
 *
 * ⚠️ **Хуваалцсан нууц үг.** 2026-10-02-нд 4 ажилтан Монгол руу явахад
 * 8 хоног үлдсэн байсан тул хүн бүрд данс үүсгэхийн оронд `ADMIN_SECRET`
 * нэг кодыг сонгов. Үүний үнэ:
 *
 *  · Код алдагдвал хэн ч сургууль үүсгэж, жагсаалтыг харж чадна
 *  · Хэн юу хийснийг кодоор нь ялгахгүй — тиймээс формд **нэрээ** бичүүлж,
 *    аудитад үлдээнэ
 *
 * Тиймээс: cookie 12 цагийн дараа дуусна, аялал дуусмагц кодоо солино.
 * Удаан хугацаанд ажиллах шийдэл биш — үүнийг мэдсээр сонгов.
 */

const COOKIE_NAME = "zedu_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET тохируулагдаагүй байна.");
  return new TextEncoder().encode(secret);
}

/** Тохируулсан админы код. Байхгүй бол админы зам бүхэлдээ хаалттай. */
export function adminSecret(): string | null {
  const s = process.env.ADMIN_SECRET;
  return s && s.length >= 12 ? s : null;
}

/**
 * Код зөв эсэх.
 *
 * ⚠️ Урт нь ялгаатай бол шууд худал — тэгэхгүй бол харьцуулалтын хугацаагаар
 * кодын уртыг таамаглаж болно. Урт нь ижил үед тэмдэгт бүрийг эцэс хүртэл
 * харьцуулж, таарахгүй газраас эрт гарахгүй.
 */
export function secretMatches(given: string): boolean {
  const real = adminSecret();
  if (!real) return false;
  if (given.length !== real.length) return false;

  let diff = 0;
  for (let i = 0; i < real.length; i++) {
    diff |= real.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

export type AdminSession = { who: string };

export async function createAdminSession(who: string): Promise<void> {
  const token = await new SignJWT({ who })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readAdminSession(): Promise<AdminSession | null> {
  // Код тохируулаагүй бол нэвтэрсэн cookie-г ч хүчингүй болгоно.
  if (!adminSecret()) return null;

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const who = (payload as Record<string, unknown>).who;
    return typeof who === "string" ? { who } : null;
  } catch {
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
