import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { classes } from "./classes";
import { users } from "./users";

/**
 * Багш ↔ эцэг эхийн яриа.
 *
 * ⚠️ Энэ нь **чат БИШ** бөгөөд чат болж хувирах ёсгүй (`docs/DECISIONS.md`
 * §17). Ялгаа нь зүгээр нэг нэршил биш — багш амьд үлдэх эсэхийг шийднэ.
 *
 * Тиймээс энд **зориуд байхгүй** зүйлс:
 *
 *  - `read_at` мессеж бүрд — «уншсан» тэмдэг байхгүй. Эцэг эх багш уншсаныг
 *    хараад «яагаад хариулахгүй байна» гэж гомдох суваг нээхгүй.
 *  - «бичиж байна…», «онлайн» — байхгүй.
 *  - Бүлгийн яриа — байхгүй. Нэг хүүхдэд нэг яриа.
 *
 * Оролцогчид нь мөрөөр биш ДҮРМЭЭР тодорхойлогдоно: тухайн хүүхдийн
 * батлагдсан эцэг эх нар (`guardians.status = 'ACTIVE'`) ба түүний ангийн
 * багш нар. Ийм учраас оролцогчийн хүснэгт байхгүй — эрх өөрчлөгдөхөд
 * (эцэг эх татгалзуулсан, багш анги сольсон) яриа өөрөө дагаж шинэчлэгдэнэ.
 */
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** Яриа хэний тухай вэ. Контекст автоматаар — «аль хүүхэд бэ» гэж асуухгүй. */
    studentUserId: uuid("student_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Аль ангийн багш нар оролцох вэ. Хүүхэд анги сольвол шинэ яриа. */
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    /** Жагсаалтыг эрэмбэлэхэд. Мессеж бүрд шинэчлэгдэнэ. */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("threads_student_class_key").on(t.studentUserId, t.classId),
    index("threads_class_recent_idx").on(t.classId, t.lastMessageAt),
  ],
);

export const threadMessages = pgTable(
  "thread_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    /** Бичсэн хүн. Багш эсвэл эцэг эх — хүүхэд ХЭЗЭЭ Ч биш. */
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("thread_messages_thread_idx").on(t.threadId, t.createdAt)],
);

/**
 * «Хаана хүртэл уншсан» — хүн бүрд НЭГ мөр, мессеж бүрд биш.
 *
 * Зорилго нь уншаагүйн ТООГ гаргах, «хэн уншсан»-ыг харуулах биш. Энэ
 * ялгаа чухал: эхнийх нь хэрэглэгчид тусална, хоёр дахь нь дарамт үүсгэнэ.
 */
export const threadReads = pgTable(
  "thread_reads",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("thread_reads_key").on(t.threadId, t.userId)],
);
