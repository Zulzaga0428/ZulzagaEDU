import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Хүүхдийн нээсэн аватарууд (`docs/DECISIONS.md` §18).
 *
 * Аватарын ЖАГСААЛТ кодод байна (`src/components/avatars.tsx`) — өгөгдлийн
 * санд биш. Шалтгаан: зураг нь код, үнэ нь шийдвэр. Хоёулаа commit-оор
 * өөрчлөгдөх ёстой, админ дэлгэцээр биш. Энэ хүснэгт зөвхөн «хэн юуг
 * нээсэн, аль нь идэвхтэй» гэдгийг хадгална.
 *
 * Оноо зарцуулсан баримт нь `points_ledger`-т сөрөг мөр болж үлдэнэ —
 * хоёулаа хамт бичигдэнэ.
 */
export const studentAvatars = pgTable(
  "student_avatars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** `AvatarId` — кодын каталогтой таарна. */
    avatarId: text("avatar_id").notNull(),
    selected: boolean("selected").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Нэг аватарыг хоёр удаа худалдаж авахгүй — давхар товшилтоос хамгаална.
    uniqueIndex("student_avatars_user_avatar_key").on(t.userId, t.avatarId),
    // Нэг хүүхэд нэг л идэвхтэй аватартай.
    uniqueIndex("student_avatars_one_selected_key")
      .on(t.userId)
      .where(sql`${t.selected}`),
  ],
);
