import { bigserial, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { users } from "./users";

/**
 * Хүүхдийн өгөгдөлтэй ажиллаж байгаа тул заавал.
 *
 * `docs/PERMISSIONS.md`-д жагсаасан үйлдлүүд энд бичигдэнэ: урилга үүсгэх,
 * асран хамгаалагч батлах, сурагч нэмэх/хасах, багш нэмэх/хасах, PIN
 * шинэчлэх, нэвтрэх оролдлого олон удаа бүтэлгүйтэх.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_school_idx").on(t.schoolId, t.createdAt),
    index("audit_log_actor_idx").on(t.actorUserId, t.createdAt),
  ],
);
