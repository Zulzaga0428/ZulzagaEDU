import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { schools, subjects } from "./schools";
import { classes } from "./classes";
import { users } from "./users";
import { files } from "./files";
import { submissionStatus } from "./enums";

export const homework = pgTable(
  "homework",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    /** NULL = ноорог. Утга орсон үед л сурагч/эцэг эх харна. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("homework_class_due_idx").on(t.classId, t.dueAt),
    index("homework_school_idx").on(t.schoolId),
  ],
);

/**
 * Даалгавар НИЙТЛЭГДЭХ үед ангийн сурагч бүрд нэг мөр үүснэ.
 *
 * Ингэснээр багшийн гол дэлгэц болох «18 / 24 хийсэн» нь энгийн тоолол,
 * «хэн хийгээгүй вэ» нь энгийн `where` болно — сурагчдыг гараар тулгах
 * шаардлагагүй.
 */
export const homeworkSubmissions = pgTable(
  "homework_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    homeworkId: uuid("homework_id")
      .notNull()
      .references(() => homework.id, { onDelete: "cascade" }),
    studentUserId: uuid("student_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: submissionStatus("status").notNull().default("ASSIGNED"),
    markedDoneAt: timestamp("marked_done_at", { withTimezone: true }),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    checkedBy: uuid("checked_by").references(() => users.id, { onDelete: "set null" }),
    teacherNote: text("teacher_note"),
  },
  (t) => [
    uniqueIndex("homework_submissions_hw_student_key").on(t.homeworkId, t.studentUserId),
    index("homework_submissions_hw_status_idx").on(t.homeworkId, t.status),
    index("homework_submissions_student_idx").on(t.studentUserId, t.status),
  ],
);

/** Багшийн хавсаргасан зураг/файл — самбарын зураг, сурах бичгийн хуудас. */
export const homeworkAttachments = pgTable(
  "homework_attachments",
  {
    homeworkId: uuid("homework_id")
      .notNull()
      .references(() => homework.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.homeworkId, t.fileId] })],
);

/** Сурагчийн илгээсэн дэвтрийн зураг. */
export const submissionAttachments = pgTable(
  "submission_attachments",
  {
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => homeworkSubmissions.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.fileId] })],
);
