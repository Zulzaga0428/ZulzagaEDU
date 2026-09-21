import "server-only";
import webpush from "web-push";
import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "@/server/db";
import {
  classMembers,
  classes,
  guardians,
  homework,
  homeworkSubmissions,
  notifications,
  pushSubscriptions,
  users,
} from "@/server/db/schema";

/**
 * Мэдэгдэл — өгөгдлийн сан дахь бүртгэл + утас руу илгээх.
 *
 * Хоёр нь тусдаа: мөр нь ҮРГЭЛЖ бичигдэнэ, илгээлт нь бүтэхгүй байж болно
 * (эцэг эх зөвшөөрөл өгөөгүй, iPhone дээр дэлгэцэн дээрээ нэмээгүй). Тиймээс
 * илгээлт бүтэлгүйтсэн нь үйлдлийг унагааж болохгүй.
 */

let configured = false;

function ready(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;

  if (!configured) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return true;
}

export type Payload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

/** Нэг хэрэглэгчийн бүх төхөөрөмж рүү. Хүчингүй захиалгыг цэвэрлэнэ. */
async function pushToUser(userId: string, payload: Payload): Promise<void> {
  if (!ready()) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        // 404/410 = хэрэглэгч аппаа устгасан эсвэл зөвшөөрлөө цуцалсан.
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    }),
  );

  if (dead.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, dead));
  }
}

/**
 * Шинэ даалгавар — ангийн сурагчид ба тэдний батлагдсан эцэг эхэд.
 *
 * Эцэг эх ангид гишүүн биш тул `guardians`-аар дамжиж олно.
 */
export async function notifyNewHomework(args: {
  schoolId: string;
  classId: string;
  homeworkId: string;
  title: string;
  className: string;
}): Promise<{ recipients: number }> {
  const students = await db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.classId, args.classId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
      ),
    );
  const studentIds = students.map((s) => s.userId);

  const parents =
    studentIds.length === 0
      ? []
      : await db
          .selectDistinct({ userId: guardians.parentUserId })
          .from(guardians)
          .where(
            and(
              inArray(guardians.studentUserId, studentIds),
              eq(guardians.status, "ACTIVE"),
            ),
          );

  const recipients = [
    ...studentIds.map((id) => ({ id, url: "/suragch" })),
    ...parents.map((p) => ({ id: p.userId, url: "/etseg-eh" })),
  ];
  if (recipients.length === 0) return { recipients: 0 };

  await db.insert(notifications).values(
    recipients.map((r) => ({
      userId: r.id,
      schoolId: args.schoolId,
      kind: "HOMEWORK_NEW" as const,
      payload: { homeworkId: args.homeworkId, title: args.title, className: args.className },
    })),
  );

  await Promise.all(
    recipients.map((r) =>
      pushToUser(r.id, {
        title: `${args.className} — шинэ даалгавар`,
        body: args.title,
        url: r.url,
        tag: `hw-${args.homeworkId}`,
      }),
    ),
  );

  return { recipients: recipients.length };
}

/** Клиентэд өгөх нийтийн түлхүүр. Нууц биш. */
export function publicVapidKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/**
 * Сурагчийн ажлыг багш шалгасныг мэдэгдэнэ.
 *
 * Хүүхдийн хувьд «багш харлаа» гэдэг нь бүхэл бүтэн шагнал. Чимээгүй
 * өнгөрвөл хоёр долоо хоногийн дараа тэмдэглэхээ болино.
 */
export async function notifyChecked(args: {
  schoolId: string;
  studentUserId: string;
  homeworkId: string;
  title: string;
  note: string | null;
}): Promise<void> {
  const parents = await db
    .selectDistinct({ userId: guardians.parentUserId })
    .from(guardians)
    .where(
      and(
        eq(guardians.studentUserId, args.studentUserId),
        eq(guardians.status, "ACTIVE"),
      ),
    );

  const recipients = [
    { id: args.studentUserId, url: "/suragch" },
    ...parents.map((p) => ({ id: p.userId, url: "/etseg-eh" })),
  ];

  await db.insert(notifications).values(
    recipients.map((r) => ({
      userId: r.id,
      schoolId: args.schoolId,
      kind: "HOMEWORK_CHECKED" as const,
      payload: { homeworkId: args.homeworkId, title: args.title, note: args.note },
    })),
  );

  await Promise.all(
    recipients.map((r) =>
      pushToUser(r.id, {
        title: "Багш шалгалаа",
        body: args.note ? `${args.title} — ${args.note}` : args.title,
        url: r.url,
        tag: `chk-${args.homeworkId}-${args.studentUserId}`,
      }),
    ),
  );
}

/**
 * Маргааш дуусах даалгаврын сануулга.
 *
 * ⚠️ Хүн бүрд НЭГ мессеж. Даалгавар тус бүрд тусад нь илгээвэл энэ нь
 * «хоёр дахь inbox» болж хувирна — энэ ангиллын аппуудыг үхүүлдэг гол
 * шалтгаан яг тэр (2026 оны зах зээлийн судалгаа).
 *
 * Зөвхөн ХИЙГЭЭГҮЙ даалгаврыг тоолно. Хийчихсэн хүүхдийг зовоохгүй.
 */
export async function sendDueReminders(
  now: Date = new Date(),
): Promise<{ students: number; parents: number; skipped: number }> {
  // Маргаашийн УБ-ын хугацаанд дуусах бүх хийгээгүй даалгавар.
  const ub = new Date(now.getTime() + 8 * 3600_000);
  const y = ub.getUTCFullYear();
  const m = ub.getUTCMonth();
  const d = ub.getUTCDate();
  // Маргаашийн 00:00–23:59 (УБ) → UTC
  const from = new Date(Date.UTC(y, m, d + 1, -8, 0, 0));
  const to = new Date(Date.UTC(y, m, d + 2, -8, 0, 0));

  const rows = await db
    .select({
      studentUserId: homeworkSubmissions.studentUserId,
      studentName: users.name,
      schoolId: homework.schoolId,
      className: classes.name,
    })
    .from(homeworkSubmissions)
    .innerJoin(homework, eq(homework.id, homeworkSubmissions.homeworkId))
    .innerJoin(users, eq(users.id, homeworkSubmissions.studentUserId))
    .innerJoin(classes, eq(classes.id, homework.classId))
    .where(
      and(
        eq(homeworkSubmissions.status, "ASSIGNED"),
        gte(homework.dueAt, from),
        lt(homework.dueAt, to),
        isNotNull(homework.publishedAt),
      ),
    );

  if (rows.length === 0) return { students: 0, parents: 0, skipped: 0 };

  // Сурагч бүрд хэдэн даалгавар үлдсэнийг тоолно.
  const perStudent = new Map<string, { count: number; name: string; schoolId: string }>();
  for (const r of rows) {
    const cur = perStudent.get(r.studentUserId);
    if (cur) cur.count += 1;
    else perStudent.set(r.studentUserId, { count: 1, name: r.studentName, schoolId: r.schoolId });
  }

  const studentIds = [...perStudent.keys()];
  const links = await db
    .select({ parentUserId: guardians.parentUserId, studentUserId: guardians.studentUserId })
    .from(guardians)
    .where(and(inArray(guardians.studentUserId, studentIds), eq(guardians.status, "ACTIVE")));

  // Эцэг эх бүрд хүүхдүүдийнх нь нийлбэрээр НЭГ мессеж.
  const perParent = new Map<string, { parts: string[]; schoolId: string }>();
  for (const l of links) {
    const st = perStudent.get(l.studentUserId);
    if (!st) continue;
    const cur = perParent.get(l.parentUserId) ?? { parts: [], schoolId: st.schoolId };
    cur.parts.push(`${st.name.split(" ").pop()} — ${st.count}`);
    perParent.set(l.parentUserId, cur);
  }

  let students = 0;
  for (const [id, st] of perStudent) {
    await pushToUser(id, {
      title: "Маргааш дуусах даалгавар",
      body: `${st.count} даалгавар хийгээгүй байна`,
      url: "/suragch",
      tag: "due-reminder",
    });
    students += 1;
  }

  let parents = 0;
  for (const [id, p] of perParent) {
    await pushToUser(id, {
      title: "Маргааш дуусах даалгавар",
      body: p.parts.join(" · "),
      url: "/etseg-eh",
      tag: "due-reminder",
    });
    parents += 1;
  }

  return { students, parents, skipped: rows.length - perStudent.size };
}

/**
 * Зарлалын мэдэгдэл.
 *
 * Нэг зарлал = нэг мэдэгдэл. Зарлал нь ховор үйл явдал тул багцлах
 * шаардлагагүй — харин олон болбол тэр нь өөрөө анхааруулга: багш зарлалыг
 * чат мэт ашиглаж эхэлсэн байна.
 */
export async function notifyAnnouncement(args: {
  schoolId: string;
  announcementId: string;
  body: string;
  className: string | null;
  students: string[];
  parents: string[];
}): Promise<{ recipients: number }> {
  const recipients = [
    ...args.students.map((id) => ({ id, url: "/suragch" })),
    ...args.parents.map((id) => ({ id, url: "/etseg-eh" })),
  ];
  if (recipients.length === 0) return { recipients: 0 };

  await db.insert(notifications).values(
    recipients.map((r) => ({
      userId: r.id,
      schoolId: args.schoolId,
      kind: "ANNOUNCEMENT" as const,
      payload: { announcementId: args.announcementId, body: args.body },
    })),
  );

  const short = args.body.length > 120 ? args.body.slice(0, 117) + "…" : args.body;

  await Promise.all(
    recipients.map((r) =>
      pushToUser(r.id, {
        title: args.className ? `${args.className} — зарлал` : "Сургуулийн зарлал",
        body: short,
        url: r.url,
        tag: `ann-${args.announcementId}`,
      }),
    ),
  );

  return { recipients: recipients.length };
}
