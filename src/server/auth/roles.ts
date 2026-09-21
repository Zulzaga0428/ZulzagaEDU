/**
 * Дүрийн нэрс. Клиент талаас ч импортлогдож болохоор `server-only` биш.
 *
 * ⚠️ Эдгээрийг харуулахад ашиглана. ЭРХИЙГ хэзээ ч клиент талд шийдэхгүй —
 * `docs/PERMISSIONS.md` §1.
 */
export const MEMBERSHIP_ROLES = [
  "ACADEMIC_MANAGER",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const ROLE_LABEL: Record<MembershipRole, string> = {
  ACADEMIC_MANAGER: "Хичээлийн эрхлэгч",
  TEACHER: "Багш",
  PARENT: "Эцэг эх",
  STUDENT: "Сурагч",
};

/** Нэвтэрсний дараа дүр бүр хаашаа очих вэ. */
export const ROLE_HOME: Record<MembershipRole, string> = {
  ACADEMIC_MANAGER: "/erhlegch",
  TEACHER: "/bagsh",
  PARENT: "/etseg-eh",
  STUDENT: "/suragch",
};
