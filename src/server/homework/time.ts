/**
 * Улаанбаатарын цаг. Монгол зуны цагийн шилжилт хэрэглэдэггүй тул
 * UTC+8 тогтмол.
 *
 * ⚠️ Сервер UTC-ээр ажиллана. Багш «маргааш» гэж сонгоод эцсийн хугацаа нь
 * өмнөх орой болж харагдвал даалгаврын системд итгэхээ болино — тиймээс
 * хөрвүүлэлт нэг л газарт байна.
 */
const UB_OFFSET_HOURS = 8;

/** «2026-09-21» + оройн 23:59 (УБ) → UTC мөч. */
export function endOfDayUb(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Огноо буруу байна.");
  return new Date(Date.UTC(y, m - 1, d, 23 - UB_OFFSET_HOURS, 59, 0));
}

/** Өнөөдрийн УБ-ын огноог `YYYY-MM-DD` хэлбэрээр. */
export function todayUb(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + UB_OFFSET_HOURS * 3600_000);
  return shifted.toISOString().slice(0, 10);
}

export function addDaysUb(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

/** Багш, эцэг эхэд харуулах хэлбэр: «9-р сарын 22, Мягмар». */
export function formatDueUb(due: Date): string {
  const shifted = new Date(due.getTime() + UB_OFFSET_HOURS * 3600_000);
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return `${month}-р сарын ${day}, ${WEEKDAYS[shifted.getUTCDay()]}`;
}

/** Эцсийн хугацаа өнгөрсөн үү. */
export function isOverdue(due: Date, now: Date = new Date()): boolean {
  return due.getTime() < now.getTime();
}
