import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Сургуулиас ирсэн хүсэлт (`docs/DECISIONS.md` §21).
 *
 * Холбоо барих хуудсанд `+976 0000 0000` гэсэн орлуулагч дугаар байсан —
 * захирал дарж залгаад юу ч болохгүй. Хуурамч дугаар бол дугааргүй байхаас
 * **муу**: итгэл нэг дор унана.
 *
 * Жинхэнэ дугаар бэлэн болтол хүлээхийн оронд маягт тавив. Энэ нь хүлээхээс
 * зүгээр нэг дээр биш — залгасан дуудлага мартагддаг, бичигдсэн хүсэлт
 * мартагддаггүй.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolName: text("school_name").notNull(),
    contactName: text("contact_name").notNull(),
    phone: text("phone").notNull(),
    note: text("note"),
    /** Хариу өгсөн эсэх. Админ дэлгэцээс тэмдэглэнэ. */
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leads_created_idx").on(t.createdAt)],
);
