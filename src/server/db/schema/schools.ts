import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schoolStatus } from "./enums";

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Дэд домэйнд ашиглана: <slug>.zulzagaedu.mn */
  slug: text("slug").notNull().unique(),
  status: schoolStatus("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
