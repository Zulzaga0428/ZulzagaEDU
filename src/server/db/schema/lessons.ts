import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { schools, subjects } from "./schools";
import { classes } from "./classes";
import { users } from "./users";

/**
 * Долоо хоногийн хичээлийн хуваарь.
 *
 * Зориуд ЖИЖИГ байлгав. Огноо, улирал, ээлж, багш солих, кабинет — эдгээрийг
 * оруулбал сургуулийн хуваарийн систем болж хувирна, тэр нь өөр бүтээгдэхүүн
 * (`docs/DECISIONS.md` §7-ийн сүнс).
 *
 * Багш улиралд НЭГ удаа бөглөнө. Эцэг эх, сурагч зөвхөн уншина.
 *
 * Цаг биш, **дараалал** хадгална: «3 дахь хичээл». Сургууль бүр өөр цагийн
 * хуваарьтай, ээлж ч бий. Дарааллыг бүгд адилхан ойлгоно.
 */
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    /** 1 = Даваа … 6 = Бямба. Ням гарагт хичээл байхгүй. */
    dayOfWeek: integer("day_of_week").notNull(),
    /** Тухайн өдрийн хэд дэх хичээл бэ (1-ээс эхэлнэ). */
    period: integer("period").notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
    /** Хичээлийн жагсаалтад байхгүй зүйл (жишээ «Ангийн цаг»). */
    customName: text("custom_name"),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Нэг өдрийн нэг цагт нэг л хичээл.
    uniqueIndex("lessons_class_day_period_key").on(t.classId, t.dayOfWeek, t.period),
    index("lessons_class_idx").on(t.classId, t.dayOfWeek, t.period),
  ],
);
