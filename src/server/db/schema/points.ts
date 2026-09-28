import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { users } from "./users";
import { homework } from "./homework";

/**
 * Онооны дэвтэр — хүүхдийн урамшуулал (`docs/DECISIONS.md` §18).
 *
 * **Дэвтрийн зарчим:** оноо нэмэгдэх, зарцуулагдах бүр нэг мөр болно.
 * Үлдэгдлийг нийлбэрээр гаргана. Нэг тоо шинэчилж явахаас илүү: хүүхэд,
 * эцэг эх «яагаад ийм оноотой байна вэ» гэдгийг үргэлж харж чадна.
 *
 * ⚠️ **Багшийн үйлдэл оноонд НӨЛӨӨЛӨХГҮЙ.** Zulzaga 2026-09-28-нд: багш
 * 25 хүүхдийн дэвтрийг аппаар шалгана гэвэл бөөн ажил, дээр нь дэвтрийг
 * нь ангидаа аль хэдийн хардаг. Хэрэв оноо багшийн шалгалтаас хамаарвал
 * эцэг эх «багш аа шалгаач» гэж шахаж, дарамт тойруу замаар багш дээр
 * буцаж очно. Тиймээс оноог зөвхөн ХҮҮХДИЙН үйлдэл үүсгэнэ.
 */
export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Эерэг = олсон, сөрөг = зарцуулсан. */
    points: integer("points").notNull(),
    /** `HOMEWORK_DONE`, `PHOTO`, `COMEBACK`, `SPEND` гэх мэт. */
    reason: text("reason").notNull(),
    /** Аль даалгавраас вэ. Давхар олгохоос хамгаална. */
    homeworkId: uuid("homework_id").references(() => homework.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /*
      Нэг даалгаварт нэг шалтгаанаар нэг л удаа. Хүүхэд «хийсэн» → «буцаах»
      → «хийсэн» гэж дарж оноо тармуулахаас хамгаална.
    */
    uniqueIndex("points_ledger_once_key").on(t.userId, t.homeworkId, t.reason),
    index("points_ledger_user_idx").on(t.userId, t.createdAt),
  ],
);
