import "server-only";
import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  classMembers,
  guardians,
  notifications,
  pushSubscriptions,
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
