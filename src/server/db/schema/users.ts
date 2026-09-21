import { sql } from "drizzle-orm";
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
import {
  guardianRelation,
  guardianStatus,
  membershipRole,
  membershipStatus,
} from "./enums";

/**
 * Нэг хүн = нэг мөр. Дүр нь `memberships`-д тусдаа байна.
 *
 * ⚠️ Сурагчид имэйл ч, Google данс ч БАЙХГҮЙ — тэд `credentials`-ийн
 * код + PIN-ээр нэвтэрнэ. Тиймээс хоёр багана хоёулаа NULL байж болно.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email"),
    /** Насанд хүрэгчид үүгээр нэвтэрнэ. Сурагчид NULL. */
    phone: text("phone"),
    googleSub: text("google_sub"),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_key")
      .on(t.email)
      .where(sql`${t.email} is not null`),
    uniqueIndex("users_phone_key")
      .on(t.phone)
      .where(sql`${t.phone} is not null`),
    uniqueIndex("users_google_sub_key")
      .on(t.googleSub)
      .where(sql`${t.googleSub} is not null`),
  ],
);

/**
 * Хүн ↔ сургууль ↔ дүр.
 *
 * Тэр сургуульд багшилдаг бөгөөд хүүхэд нь тэнд сурдаг хүн ХОЁР мөртэй байна
 * (`TEACHER` ба `PARENT`). Апп доторх дүрийн сэлгүүр ингэж ажиллана.
 */
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    status: membershipStatus("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("memberships_user_school_role_key").on(t.userId, t.schoolId, t.role),
    index("memberships_school_role_idx").on(t.schoolId, t.role),
    index("memberships_user_idx").on(t.userId),
  ],
);

/**
 * Нэвтрэх баталгаа — бүх дүрд нэг систем.
 *
 * Сурагч **кодоороо**, насанд хүрэгч **утасны дугаараараа** танигдаж,
 * хоёулаа PIN-ээр баталгаажна.
 *
 * ⚠️ 4 оронтой PIN нь ердөө 10,000 хувилбар — өөрөө хамгаалалт БИШ.
 * Жинхэнэ нууц нь нэвтрэх код, жинхэнэ хамгаалалт нь хурдны хязгаар.
 * Тиймээс `failedAttempts` ба `lockedUntil` нь чимэг биш, шаардлага.
 */
export const credentials = pgTable("credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Зөвхөн сурагчид. Төөрөгдүүлэхгүй тэмдэгттэй: жишээ «3A-K7QMX2» */
  loginCode: text("login_code").unique(),
  pinHash: text("pin_hash").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

/**
 * Эцэг эх ↔ хүүхэд. Хамгийн эмзэг хүснэгт.
 *
 * ⚠️ `PENDING` → `ACTIVE` болох цорын ганц зам нь багш/эрхлэгчийн баталгаа.
 * Эцэг эх өөрөө өөрийгөө хүүхэдтэй холбож ЧАДАХГҮЙ.
 */
export const guardians = pgTable(
  "guardians",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentUserId: uuid("parent_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentUserId: uuid("student_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    relation: guardianRelation("relation").notNull(),
    status: guardianStatus("status").notNull().default("PENDING"),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("guardians_parent_student_key").on(t.parentUserId, t.studentUserId),
    index("guardians_student_idx").on(t.studentUserId, t.status),
    index("guardians_parent_idx").on(t.parentUserId, t.status),
  ],
);
