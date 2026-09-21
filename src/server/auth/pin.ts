import "server-only";
import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";

// promisify нь scrypt-ийн сонголттой хувилбарыг таньдаггүй тул гараар.
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/**
 * PIN-ийг hash хийх, нэвтрэх код үүсгэх.
 *
 * **scrypt** ашиглав — Node дотор суусан, гадны сан хэрэггүй, санах ойн
 * хатуу шаардлагатай тул GPU-гаар таах нь үнэтэй.
 *
 * ⚠️ Гэхдээ энд шулуухан хэлэх ёстой зүйл бий: 4 оронтой PIN бол 10,000
 * хувилбар. Ямар ч алгоритм тэр тоог аврахгүй. Hash нь зөвхөн **сан
 * алдагдсан** үеийн хамгаалалт.
 *
 * Онлайн халдлагаас хамгаалах зүйл нь өөр:
 *   · нэвтрэх код таамаглашгүй байх (жинхэнэ нууц нь ЭНЭ)
 *   · буруу оролдлогыг тоолж түгжих
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pin, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");

  const actual = await scryptAsync(pin, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  // Урт нь ижил үед л timingSafeEqual ажиллана.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Нэвтрэх код.
 *
 * Тэмдэгтийн багцаас `0 O I 1 5 S` зэрэг андуурагддагийг хассан — 8 настай
 * хүүхэд цаасан дээрээс уншиж бичнэ гэдгийг санах хэрэгтэй.
 *
 * 6 тэмдэгт × 30 хувилбар ≈ 730 сая. Хурдны хязгаартай хослуулахад
 * таамаглах боломжгүй.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";
const CODE_LENGTH = 6;

export function generateLoginCode(prefix: string): string {
  let tail = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    tail += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `${prefix}-${tail}`;
}

/** Санамсаргүй 4 оронтой PIN. Урд нь 0 байж болно. */
export function generatePin(): string {
  return String(randomInt(10000)).padStart(4, "0");
}

/** Хэт амархан таамаглагдах PIN-ийг татгалзана. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true; // 1111
  if ("0123456789".includes(pin)) return true; // 1234, 3456
  if ("9876543210".includes(pin)) return true; // 4321
  return false;
}
