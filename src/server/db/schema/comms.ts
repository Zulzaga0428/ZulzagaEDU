import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { classes } from "./classes";
import { users } from "./users";
import { announcementAudience, notificationKind } from "./enums";

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** NULL = сургууль даяар. Зөвхөн эрхлэгч ийм зарлал бичнэ. */
    classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    audience: announcementAudience("audience").notNull().default("ALL"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("announcements_class_idx").on(t.classId, t.createdAt),
    index("announcements_school_idx").on(t.schoolId, t.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    kind: notificationKind("kind").notNull(),
    payload: jsonb("payload").notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt)],
);

/**
 * Web push-ийн бүртгэл.
 *
 * ⚠️ iOS дээр эдгээр мөр нь хэрэглэгч аппыг «дэлгэцэн дээрээ нэмсэн» үед л
 * үүснэ. Тиймээс тэр алхам урилгын урсгалд заавал байх ёстой — эс бөгөөс
 * даалгаврын сануулга iPhone-той эцэг эхэд хэзээ ч очихгүй.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);
