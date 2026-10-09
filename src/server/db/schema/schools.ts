import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schoolStatus } from "./enums";

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Дэд домэйнд ашиглана: <slug>.zulzagaedu.mn */
  slug: text("slug").notNull().unique(),
  status: schoolStatus("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  /*
    Сургуулийн профайл (Zulzaga, 2026-10-09) — бүгд заавал БИШ. Сургууль бүр
    аппыг «өөрийн» гэж мэдрэх нь захиралд чухал. Админ үүсгэхдээ текстийг
    оруулж болно, эрхлэгч дараа нь бүгдийг өөрөө засна (`/erhlegch/surguuli`).

    Лого, зураг нь `files` мөр рүү заана — ердийн зурагтай ижил R2-д
    хадгалагдана. FK тавиагүй нь зориуд: `files` нь `schools` рүү заадаг тул
    хоёр талын холбоос модулийн мөчлөг үүсгэнэ. Бүрэн бүтэн байдлыг
    `school/profile.ts` хариуцна.
  */
  logoFileId: uuid("logo_file_id"),
  photoFileId: uuid("photo_file_id"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  facebook: text("facebook"),
});

/** Хичээлүүд сургууль бүрт тусдаа — үндсэн багцыг seed хийнэ. */
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("subjects_school_idx").on(t.schoolId, t.sortOrder)],
);
