import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools";
import { classes } from "./classes";
import { users } from "./users";
import { invitationKind } from "./enums";

/**
 * QR / линк урилга.
 *
 * ⚠️ Токеныг өөрийг нь хадгалахгүй — зөвхөн `tokenHash`. Өгөгдлийн сан
 * алдагдсан ч хүчинтэй урилга гарахгүй.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
    kind: invitationKind("kind").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    /** Эцэг эхийн урилга тодорхой хүүхдэд чиглэнэ. */
    targetStudentId: uuid("target_student_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    maxUses: integer("max_uses").notNull().default(1),
    usedCount: integer("used_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("invitations_school_idx").on(t.schoolId, t.kind),
    index("invitations_class_idx").on(t.classId),
  ],
);
