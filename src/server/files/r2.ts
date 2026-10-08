import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 — зургийн агуулах (2026-10-09-нөөс).
 *
 * Өмнө нь зураг бүр нэг серверт залгасан нэг диск дээр хадгалагддаг байв.
 * Тэр нь хоёр хана мөргөдөг: дискний хэмжээ (хүүхэд бүр өдөрт нэг зураг
 * илгээвэл бүх улсын хэмжээнд өдөрт ~76 GB) ба хоёр дахь сервер нэмэх
 * боломжгүй (диск нэг л сервертэй залгагдана).
 *
 * ⚠️ Bucket нь ХУВИЙН. Хүүхдийн дэвтрийн зураг нийтэд нээлттэй холбоосоор
 * хэзээ ч явах ёсгүй. Апп эрхийг шалгасны ДАРАА л хэдхэн минут хүчинтэй
 * гарын үсэгтэй холбоос өгнө (`signedUrl`). Холбоос дамжуулагдсан ч удахгүй
 * ажиллахаа болино.
 *
 * Хаана байгааг `files.storageKey` өөрөө хэлнэ: `r2:` угтвартай бол R2,
 * угтваргүй бол хуучин диск. Ингэснээр хоёр нь зэрэг ажиллаж, хуучин зургийг
 * нэг дор хуулах шаардлагагүй, схемийн өөрчлөлт ч хэрэггүй.
 */

export const R2_SCHEME = "r2:";

type R2 = { client: AwsClient; base: string; prefix: string };

let cached: R2 | null | undefined;

function r2(): R2 | null {
  if (cached !== undefined) return cached;
  const id = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET_NAME;
  cached =
    id && secret && endpoint && bucket
      ? {
          client: new AwsClient({
            accessKeyId: id,
            secretAccessKey: secret,
            service: "s3",
            region: "auto",
          }),
          base: `${endpoint.replace(/\/+$/, "")}/${bucket}`,
          /*
            Зөвхөн локал туршилтад (`dev/`) — тестийн зураг жинхэнэ сургуулийн
            зурагтай хутгалдахгүйн тулд. Продод тавихгүй.
          */
          prefix: process.env.R2_KEY_PREFIX ?? "",
        }
      : null;
  return cached;
}

/** R2 тохируулагдсан эсэх. Үгүй бол хуучнаараа диск рүү бичнэ. */
export function r2Enabled(): boolean {
  return r2() !== null;
}

export function isR2Key(storageKey: string): boolean {
  return storageKey.startsWith(R2_SCHEME);
}

/** `r2:abc/def.bin` → bucket доторх `abc/def.bin`. */
export function objectKeyOf(storageKey: string): string {
  return storageKey.slice(R2_SCHEME.length);
}

/** Шинэ объектын түлхүүр. Тусгай тэмдэгтгүй — URL-д кодлох шаардлагагүй. */
export function newObjectKey(schoolId: string, name: string): string {
  const cfg = r2();
  return `${cfg?.prefix ?? ""}${schoolId}/${name}`;
}

function urlFor(cfg: R2, objectKey: string): string {
  const path = objectKey.split("/").map(encodeURIComponent).join("/");
  return `${cfg.base}/${path}`;
}

function need(): R2 {
  const cfg = r2();
  if (!cfg) throw new Error("R2 тохируулагдаагүй байна.");
  return cfg;
}

export async function r2Put(objectKey: string, data: Uint8Array, mime: string): Promise<void> {
  const cfg = need();
  const res = await cfg.client.fetch(urlFor(cfg, objectKey), {
    method: "PUT",
    // `slice()` нь шинэ ArrayBuffer-тэй хуулбар — fetch-ийн төрөлд таарна.
    // Зураг 5MB-аас бага тул хуулбар нь асуудалгүй.
    body: data.slice(),
    headers: {
      "Content-Type": mime,
      /*
        ⚠️ ЗААВАЛ. Next-ийн серверт fetch нь биеийг урсгал болгож, уртыг нь
        алдаг — R2 «411 Length Required» гэж татгалздаг. Ганцаараа туршихад
        ажилладаг ч апп дотор унадаг тул тест нь анзаарахгүй. 2026-10-09-нд
        жинхэнэ дэлгэцээр илэрсэн.
      */
      "Content-Length": String(data.byteLength),
      // Хувийн зураг — хөтөч хадгална, дундын кэш хадгалахгүй.
      "Cache-Control": "private, max-age=3600",
    },
  });
  if (!res.ok) {
    throw new Error(`R2 руу хадгалж чадсангүй (${res.status}).`);
  }
}

export async function r2Delete(objectKey: string): Promise<void> {
  const cfg = need();
  const res = await cfg.client.fetch(urlFor(cfg, objectKey), { method: "DELETE" });
  // 404 — аль хэдийн байхгүй. Устгах нь зорилго байсан тул алдаа биш.
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2-оос устгаж чадсангүй (${res.status}).`);
  }
}

/** Зургийг R2-оос татна — хуучин зургийг хуулах, шалгахад. */
export async function r2Get(objectKey: string): Promise<Uint8Array | null> {
  const cfg = need();
  const res = await cfg.client.fetch(urlFor(cfg, objectKey), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2-оос уншиж чадсангүй (${res.status}).`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Хэдхэн хугацаанд хүчинтэй, гарын үсэгтэй холбоос.
 *
 * ⚠️ Үүнийг ЗӨВХӨН эрх шалгасны дараа дуудна (`readFileFor`). Холбоос
 * өөрөө эрх шалгадаггүй — мэддэг хүн бүр хугацаа дуустал харна.
 */
export async function signedUrl(objectKey: string, seconds: number): Promise<string> {
  const cfg = need();
  const url = new URL(urlFor(cfg, objectKey));
  url.searchParams.set("X-Amz-Expires", String(seconds));
  const signed = await cfg.client.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}
