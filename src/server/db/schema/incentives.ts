import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { users } from "./users";
import { incentiveStatus } from "./enums";

/**
 * Багшийн пилотын хөлс — сар бүрийн нэг мөр.
 *
 * `docs/DECISIONS.md` §14-ийн гурван хязгаар энэ хүснэгтэд шууд туссан:
 *
 *  1. **Хэрэглээний төлөө ТӨЛӨХГҮЙ.** Тиймээс энд даалгаврын тоо, нэвтэрсэн
 *     өдөр гэх мэт ямар ч хэмжүүр БАЙХГҮЙ. Дүн нь долоо хоног бүрийн
 *     саналын төлөө — хэрэглээнээс хамаарахгүй.
 *  2. **Хэн оролцохыг эрхлэгч шийднэ.** Мөр байхгүй бол багш юу ч харахгүй.
 *     Автоматаар хүн бүрд үүсгэхгүй — эс бөгөөс сургуулийн бүх багшид
 *     мөнгө амласан болно.
 *  3. **Дуусах хугацаатай.** Сар бүр тусдаа мөр тул үргэлжлүүлэхгүй бол
 *     өөрөө зогсоно. «Цалин» болж хувирахгүй.
 */
export const teacherIncentives = pgTable(
  "teacher_incentives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    teacherUserId: uuid("teacher_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `YYYY-MM` — УБ-гийн цагаар. Сар бүрд нэг мөр. */
    period: text("period").notNull(),
    /** Төгрөгөөр. Пилотод 50,000 ч гэсэн сургууль бүрд өөр байж болно. */
    amountMnt: integer("amount_mnt").notNull(),
    status: incentiveStatus("status").notNull().default("PENDING"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Эрхлэгчийн тэмдэглэл — «бэлнээр өгсөн», «дансаар» гэх мэт. */
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("teacher_incentives_teacher_period_key").on(t.teacherUserId, t.period),
    index("teacher_incentives_school_period_idx").on(t.schoolId, t.period),
  ],
);
