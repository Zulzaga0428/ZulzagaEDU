import type { StudentHomeworkRow } from "@/server/homework/service";
import { todayUb } from "@/server/homework/time";

/**
 * Даалгаврыг хугацаагаар нь бүлэглэх логик — эцэг эх, сурагч хоёуланд.
 *
 * Тусдаа файлд байгаа шалтгаан: энэ нь UI биш, **шийдвэр**. «Юуг нь эхэнд
 * харуулах вэ» гэдэг нь бүтээгдэхүүний асуулт бөгөөд тестлэгдэх ёстой.
 *
 * Эцэг эх dashboard хүсэхгүй. Оройн 8 цагт 30 секунд зарцуулаад «өнөөдөр
 * юу хийх ёстой вэ, хаана туслах хэрэгтэй вэ» гэдгийг мэдэхийг хүснэ.
 */

export type DueGroups = {
  /** Хугацаа нь өнгөрсөн ч хийгээгүй — хамгийн түрүүнд. */
  overdue: StudentHomeworkRow[];
  /** Өнөөдөр дуусах. */
  today: StudentHomeworkRow[];
  /** Маргааш ба цаашид. */
  upcoming: StudentHomeworkRow[];
  /** Багш саяхан шалгаж тэмдэглэл үлдээсэн. */
  notes: StudentHomeworkRow[];
  /** Хүлээгдэж буй нийт — картын гол тоо. */
  pendingCount: number;
  doneCount: number;
  totalCount: number;
};

/** УБ-ын өдрийг харьцуулна — `dueAt` нь тэр өдрийн 23:59. */
function dueDayUb(due: Date): string {
  return todayUb(due);
}

export function groupByDue(
  items: StudentHomeworkRow[],
  now: Date = new Date(),
): DueGroups {
  const today = todayUb(now);
  const pending = items.filter((h) => h.status === "ASSIGNED");

  return {
    overdue: pending.filter((h) => dueDayUb(h.dueAt) < today),
    today: pending.filter((h) => dueDayUb(h.dueAt) === today),
    upcoming: pending.filter((h) => dueDayUb(h.dueAt) > today),
    // Тэмдэглэлгүй шалгалт эцэг эхэд хэлэх зүйлгүй тул шүүнэ.
    notes: items
      .filter((h) => h.status === "CHECKED" && h.teacherNote)
      .sort((a, b) => (b.checkedAt?.getTime() ?? 0) - (a.checkedAt?.getTime() ?? 0))
      .slice(0, 3),
    pendingCount: pending.length,
    doneCount: items.length - pending.length,
    totalCount: items.length,
  };
}

/** Картын дээд мөр — эцэг эх ганцхан өгүүлбэр уншиж ойлгох ёстой. */
export function parentHeadline(g: DueGroups): { text: string; tone: "сайн" | "анхаар" | "хоосон" } {
  if (g.totalCount === 0) return { text: "Одоогоор даалгавар алга.", tone: "хоосон" };
  if (g.overdue.length > 0) {
    return { text: `${g.overdue.length} даалгаврын хугацаа өнгөрчээ.`, tone: "анхаар" };
  }
  if (g.today.length > 0) {
    return { text: `Өнөөдөр ${g.today.length} даалгавар хийх ёстой.`, tone: "анхаар" };
  }
  if (g.pendingCount > 0) {
    return { text: `Хийх ${g.pendingCount} даалгавар байна.`, tone: "сайн" };
  }
  return { text: "Бүгдийг хийсэн байна 🌿", tone: "сайн" };
}

/**
 * Сурагчийн нүүрний дээд мөр.
 *
 * Хүүхдэд хувь хэлэхгүй, тоо хэлнэ. Мөн хоцорсныг зэмлэхгүй — «өчигдрийнх»
 * гэдэг нь хангалттай тодорхой, гутаахгүй. 7 настай хүүхэд аппыг дайсан
 * гэж мэдэрвэл дахиж нээхгүй.
 */
export function studentHeadline(g: DueGroups): string {
  if (g.totalCount === 0) return "Даалгавар алга. Амарч байгаарай 🌿";
  if (g.pendingCount === 0) return "Бүгдийг хийчихлээ 🎉";
  const now = g.overdue.length + g.today.length;
  if (now > 0) return `Одоо ${now} зүйл хийх байна`;
  return `Хийх ${g.pendingCount} зүйл байна`;
}
