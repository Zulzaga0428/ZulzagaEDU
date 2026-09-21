import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * Сессийн cookie-гийн механик — гарын үсэг зурах, унших, устгах.
 *
 * ⚠️ Энэ файл зөвхөн cookie-д ЮУ БИЧИГДСЭНИЙГ хэлнэ. Тэр хүн одоо ч гэсэн
 * тухайн сургуульд эрхтэй эсэхийг `access.ts` өгөгдлийн сангаас шалгана.
 * Гарын үсэгтэй cookie хуурамчлагдахгүй ч, хасагдсан багшийн cookie нь
 * хүчинтэй хэвээр үлдэж болно.
 */

const COOKIE_NAME = "zedu_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 хоног

export type SessionPayload = {
  userId: string;
  schoolId: string;
  /** Идэвхтэй дүр. Хоёр дүртэй хүн апп дотроос сэлгэнэ. */
  role: MembershipRole;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET тохируулагдаагүй байна.");
  }
  return new TextEncoder().encode(secret);
}

async function sign(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

async function verify(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { userId, schoolId, role } = payload as Record<string, unknown>;
    if (typeof userId !== "string" || typeof schoolId !== "string" || typeof role !== "string") {
      return null;
    }
    return { userId, schoolId, role: role as MembershipRole };
  } catch {
    // Хугацаа дууссан эсвэл гарын үсэг таарахгүй — нэвтрээгүйтэй адил.
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await sign(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Cookie-д бичигдсэнийг буцаана. Эрхийг ШАЛГАХГҮЙ — `access.ts`-ийг үз. */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verify(cookieStore.get(COOKIE_NAME)?.value);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
