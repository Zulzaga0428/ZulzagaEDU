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
import { classMemberStatus, classRole } from "./enums";

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** «3А» */
    name: text("name").notNull(),
    /** 1–12 (2026-10-09-нөөс; өмнө нь 1–5) */
    grade: integer("grade").notNull(),
    /** «2026-2027» */
    academicYear: text("academic_year").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    /**
     * Анги удирдсан багш — эцэг эхтэй холбоотой БҮХ зүйл түүнд (Zulzaga,
     * 2026-10-10): яриа, хүсэлт батлах, QR урилга, мэдэгдэл. Хичээлийн багш нар
     * зөвхөн даалгавар өгнө. 6–12-р ангид 10+ багш байх тул эцэг эхийн нэг
     * мессеж 10 утас дуугаргахгүйн тулд.
     *
     * `null` бол ангийн БҮХ багш өмнөх шигээ — 1–5-р ангид ихэвчлэн ганц багш
     * тул эрхлэгч сонгох хүртэл юу ч өөрчлөгдөхгүй.
     */
    homeroomTeacherId: uuid("homeroom_teacher_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("classes_school_year_name_key").on(t.schoolId, t.academicYear, t.name),
    index("classes_school_idx").on(t.schoolId),
  ],
);

/**
 * ⚠️ Зөвхөн БАГШ ба СУРАГЧ. Эцэг эх ангид гишүүн биш.
 *
 * Эцэг эх ангийн мэдээллийг хүүхдээрээ дамжуулан харна
 * (`guardians` → `classMembers`). Ингэснээр «эцэг эх буруу ангид орох»
 * гэдэг зүйл бүтцийн хувьд боломжгүй.
 */
export const classMembers = pgTable(
  "class_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: classRole("role").notNull(),
    status: classMemberStatus("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("class_members_class_user_role_key").on(t.classId, t.userId, t.role),
    index("class_members_class_role_idx").on(t.classId, t.role, t.status),
    index("class_members_user_idx").on(t.userId, t.status),
  ],
);
