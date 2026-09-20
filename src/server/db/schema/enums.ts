import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Утгууд `docs/ERD.md`-ээс. Postgres enum-д утга НЭМЭХ нь хялбар, ХАСАХ нь
 * хэцүү — тиймээс зөвхөн тогтвортой жагсаалтууд энд байна.
 */

export const schoolStatus = pgEnum("school_status", ["ACTIVE", "SUSPENDED"]);

export const membershipRole = pgEnum("membership_role", [
  "ACADEMIC_MANAGER",
  "TEACHER",
  "PARENT",
  "STUDENT",
]);

export const membershipStatus = pgEnum("membership_status", [
  "ACTIVE",
  "INVITED",
  "REMOVED",
]);

/** Ангид зөвхөн багш ба сурагч гишүүнчлэлтэй. Эцэг эх энд байхгүй. */
export const classRole = pgEnum("class_role", ["TEACHER", "STUDENT"]);

export const classMemberStatus = pgEnum("class_member_status", [
  "ACTIVE",
  "REMOVED",
]);

export const guardianRelation = pgEnum("guardian_relation", [
  "MOTHER",
  "FATHER",
  "GUARDIAN",
]);

/** PENDING → ACTIVE болгох эрх зөвхөн багш/эрхлэгчид. */
export const guardianStatus = pgEnum("guardian_status", [
  "PENDING",
  "ACTIVE",
  "REJECTED",
]);

export const invitationKind = pgEnum("invitation_kind", [
  "TEACHER",
  "PARENT",
  "STUDENT",
]);

export const submissionStatus = pgEnum("submission_status", [
  "ASSIGNED",
  "DONE",
  "CHECKED",
]);

export const announcementAudience = pgEnum("announcement_audience", [
  "ALL",
  "PARENTS",
  "STUDENTS",
]);

export const notificationKind = pgEnum("notification_kind", [
  "HOMEWORK_NEW",
  "HOMEWORK_DUE",
  "HOMEWORK_CHECKED",
  "ANNOUNCEMENT",
  "GUARDIAN_VERIFIED",
]);
