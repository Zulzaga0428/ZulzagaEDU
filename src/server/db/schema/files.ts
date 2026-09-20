import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { users } from "./users";

/**
 * Байршуулсан файлын бүртгэл. Бодит агуулга нь гадаад хадгалалтад
 * (`storageKey`-ээр).
 *
 * ⚠️ Хаяг таамаглахад бэрх байх ёстой, ГЭХДЭЭ тэр нь хамгаалалт биш.
 * Татах бүрд эрхийг сервер шалгана.
 */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "set null" }),
    storageKey: text("storage_key").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("files_school_idx").on(t.schoolId, t.createdAt)],
);
