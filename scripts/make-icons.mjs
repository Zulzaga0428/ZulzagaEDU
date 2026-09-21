/**
 * Түр зуурын PWA дүрс үүсгэнэ — брэндийн цэнхэр дэвсгэр, цагаан дугуй.
 *
 *   node scripts/make-icons.mjs
 *
 * ⚠️ Орлуулагч. Zulzaga малгайтай муурны логогоо өгөхөд эдгээрийг солино.
 * Гэхдээ iOS дээр «дэлгэцэн дээрээ нэм» ажиллахын тулд manifest-д дүрс
 * ЗААВАЛ байх ёстой тул хоосон орхиж болохгүй.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const BRAND = [0x2b, 0x85, 0xf6];
const WHITE = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Дүүрэн талбай + төвд цагаан дугуй. Maskable-д тохирно. */
function iconPng(size, circleRatio) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const cx = size / 2;
  const r = (size * circleRatio) / 2;

  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cx;
      const inside = dx * dx + dy * dy <= r * r;
      const [rr, gg, bb] = inside ? WHITE : BRAND;
      raw[p++] = rr;
      raw[p++] = gg;
      raw[p++] = bb;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });

// Maskable дүрсний захыг систем тайрдаг тул дугуйг жижиг байлгана.
for (const [name, size, ratio] of [
  ["icon-192.png", 192, 0.56],
  ["icon-512.png", 512, 0.56],
  ["icon-512-maskable.png", 512, 0.42],
]) {
  const png = iconPng(size, ratio);
  writeFileSync(`public/icons/${name}`, png);
  console.log(`${name.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`);
}
