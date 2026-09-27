import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  classMembers,
  classes,
  threadMessages,
  threadReads,
  threads,
  users,
} from "@/server/db/schema";
import {
  AccessError,
  childrenOf,
  teachesClass,
  type Viewer,
} from "@/server/auth/access";

/**
 * Багш ↔ эцэг эхийн яриа (`docs/DECISIONS.md` §17).
 *
 * ⚠️ **Хүүхэд энд ХЭЗЭЭ Ч оролцохгүй.** Сурагч дүрээр ирсэн хүсэлт бүрийг
 * татгалзана. Яриа нь хүүхдийн ТУХАЙ, хүүхэдТЭЙ биш.
 *
 * Оролцох эрхийг мөрөөр биш дүрмээр шалгана: эцэг эх бол `guardians`-ийн
 * батлагдсан холбоосоор, багш бол ангиа заадаг эсэхээр. Эрх нь хасагдмагц
 * яриа өөрөө хаагдана — оролцогчийн жагсаалт цэвэрлэх шаардлагагүй.
 */

const MAX_BODY = 2000;

/** Энэ хүн энэ яриаг харах эрхтэй юу. */
async function canSee(viewer: Viewer, threadId: string): Promise<boolean> {
  // Хүүхэд ямар ч ярианд орохгүй — хамгийн эхэнд, болзолгүй.
  if (viewer.role === "STUDENT" || viewer.role === "ACADEMIC_MANAGER") return false;

  const [row] = await db
    .select({
      studentUserId: threads.studentUserId,
      classId: threads.classId,
      schoolId: threads.schoolId,
    })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (!row || row.schoolId !== viewer.schoolId) return false;

  if (viewer.role === "TEACHER") {
    return teachesClass(viewer.userId, row.classId, viewer.schoolId);
  }

  if (viewer.role === "PARENT") {
    const children = await childrenOf(viewer.userId);
    return children.includes(row.studentUserId);
  }

  return false;
}

/**
 * Хүүхдийн яриаг олох, байхгүй бол үүсгэх.
 *
 * Эхний мессеж бичих хүртэл хоосон яриа үүсгэхгүй — жагсаалт хоосон
 * яриагаар дүүрэх нь багшид чимээ болно.
 */
async function findOrCreate(
  viewer: Viewer,
  studentUserId: string,
): Promise<{ id: string; classId: string }> {
  const [member] = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, studentUserId),
        eq(classMembers.role, "STUDENT"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    )
    .limit(1);

  if (!member) throw new AccessError("ЭРХГҮЙ");

  const [existing] = await db
    .select({ id: threads.id })
    .from(threads)
    .where(
      and(
        eq(threads.studentUserId, studentUserId),
        eq(threads.classId, member.classId),
      ),
    )
    .limit(1);

  if (existing) return { id: existing.id, classId: member.classId };

  const [created] = await db
    .insert(threads)
    .values({
      schoolId: viewer.schoolId,
      studentUserId,
      classId: member.classId,
    })
    .returning({ id: threads.id });

  return { id: created.id, classId: member.classId };
}

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: Date;
  authorUserId: string;
  authorName: string;
  mine: boolean;
};

export type ThreadView = {
  id: string;
  studentName: string;
  className: string;
  messages: ThreadMessage[];
};

/** Нэг ярианы бүх мессеж. Нээхэд «уншсан» хүртэл нь тэмдэглэнэ. */
export async function openThread(viewer: Viewer, threadId: string): Promise<ThreadView> {
  if (!(await canSee(viewer, threadId))) throw new AccessError("ЭРХГҮЙ");

  const [head] = await db
    .select({
      id: threads.id,
      studentName: users.name,
      className: classes.name,
    })
    .from(threads)
    .innerJoin(users, eq(users.id, threads.studentUserId))
    .innerJoin(classes, eq(classes.id, threads.classId))
    .where(eq(threads.id, threadId))
    .limit(1);

  if (!head) throw new AccessError("ЭРХГҮЙ");

  const rows = await db
    .select({
      id: threadMessages.id,
      body: threadMessages.body,
      createdAt: threadMessages.createdAt,
      authorUserId: threadMessages.authorUserId,
      authorName: users.name,
    })
    .from(threadMessages)
    .innerJoin(users, eq(users.id, threadMessages.authorUserId))
    .where(eq(threadMessages.threadId, threadId))
    .orderBy(asc(threadMessages.createdAt));

  await markRead(viewer, threadId);

  return {
    id: head.id,
    studentName: head.studentName,
    className: head.className,
    messages: rows.map((r) => ({ ...r, mine: r.authorUserId === viewer.userId })),
  };
}

/** Мессеж бичих. Хүүхэд бичихгүй, эрхгүй хүн бичихгүй. */
export async function sendMessage(
  viewer: Viewer,
  threadId: string,
  body: string,
): Promise<void> {
  if (!(await canSee(viewer, threadId))) throw new AccessError("ЭРХГҮЙ");

  const text = body.trim();
  if (text.length === 0) throw new Error("Мессеж хоосон байна.");
  if (text.length > MAX_BODY) throw new Error("Мессеж хэт урт байна.");

  await db.transaction(async (tx) => {
    await tx.insert(threadMessages).values({
      threadId,
      authorUserId: viewer.userId,
      body: text,
    });
    // Мөн сангийн цагаар — эрэмбэ мессежийн цагтай нийцэх ёстой.
    await tx
      .update(threads)
      .set({ lastMessageAt: sql`now()` })
      .where(eq(threads.id, threadId));
  });

  // Бичсэн хүн өөрийнхөө мессежийг уншаагүй гэж тоолуулахгүй.
  await markRead(viewer, threadId);
}

/** Эцэг эх хүүхдийнхээ талаар яриа эхлүүлнэ. */
export async function startThreadForChild(
  viewer: Viewer,
  studentUserId: string,
): Promise<string> {
  if (viewer.role === "PARENT") {
    const children = await childrenOf(viewer.userId);
    if (!children.includes(studentUserId)) throw new AccessError("ЭРХГҮЙ");
  } else if (viewer.role === "TEACHER") {
    const [member] = await db
      .select({ classId: classMembers.classId })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.userId, studentUserId),
          eq(classMembers.role, "STUDENT"),
          eq(classMembers.status, "ACTIVE"),
        ),
      )
      .limit(1);
    if (!member || !(await teachesClass(viewer.userId, member.classId, viewer.schoolId))) {
      throw new AccessError("ЭРХГҮЙ");
    }
  } else {
    throw new AccessError("ЭРХГҮЙ");
  }

  const { id } = await findOrCreate(viewer, studentUserId);
  return id;
}

/**
 * «Энд хүртэл уншлаа» гэж тэмдэглэнэ.
 *
 * ⚠️ Цагийг **өгөгдлийн сангаас** авна (`now()`), аппын `new Date()`-ээс биш.
 * Мессежийн `created_at` нь сангийн цагаар бичигддэг тул хоёрыг харьцуулахад
 * ижил цаг байх ёстой. Апп болон сангийн цаг хэдхэн секунд зөрөхөд шинэ
 * мессеж «уншсан» болж, уншаагүйн тоо 0 гарч байв.
 */
export async function markRead(viewer: Viewer, threadId: string): Promise<void> {
  await db
    .insert(threadReads)
    .values({ threadId, userId: viewer.userId, readAt: sql`now()` })
    .onConflictDoUpdate({
      target: [threadReads.threadId, threadReads.userId],
      set: { readAt: sql`now()` },
    });
}

export type ThreadSummary = {
  id: string;
  studentName: string;
  className: string;
  lastMessageAt: Date | null;
  preview: string | null;
  unread: number;
};

/**
 * Нэг хүний бүх яриа, уншаагүйн тоотой.
 *
 * ⚠️ Уншаагүйн тоонд **өөрийн бичсэн мессеж орохгүй** — эс бөгөөс хүн өөрөө
 * бичээд өөртөө мэдэгдэл үүсгэнэ.
 */
async function summaries(viewer: Viewer, ids: string[]): Promise<ThreadSummary[]> {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: threads.id,
      studentName: users.name,
      className: classes.name,
      lastMessageAt: threads.lastMessageAt,
      readAt: threadReads.readAt,
      preview: sql<string | null>`(
        select m.body from ${threadMessages} m
        where m.thread_id = ${threads.id}
        order by m.created_at desc limit 1
      )`,
      unread: sql<number>`(
        select count(*)::int from ${threadMessages} m
        where m.thread_id = ${threads.id}
          and m.author_user_id <> ${viewer.userId}
          and (${threadReads.readAt} is null or m.created_at > ${threadReads.readAt})
      )`,
    })
    .from(threads)
    .innerJoin(users, eq(users.id, threads.studentUserId))
    .innerJoin(classes, eq(classes.id, threads.classId))
    .leftJoin(
      threadReads,
      and(eq(threadReads.threadId, threads.id), eq(threadReads.userId, viewer.userId)),
    )
    .where(inArray(threads.id, ids))
    .orderBy(desc(threads.lastMessageAt));

  return rows.map((r) => ({
    id: r.id,
    studentName: r.studentName,
    className: r.className,
    lastMessageAt: r.lastMessageAt,
    preview: r.preview,
    unread: r.unread,
  }));
}

/** Багшийн ярианууд — зөвхөн заадаг ангиудынх. */
export async function teacherThreads(viewer: Viewer): Promise<ThreadSummary[]> {
  if (viewer.role !== "TEACHER") throw new AccessError("ЭРХГҮЙ");

  const myClassIds = await db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, viewer.userId),
        eq(classMembers.role, "TEACHER"),
        eq(classMembers.status, "ACTIVE"),
        eq(classes.schoolId, viewer.schoolId),
      ),
    );

  if (myClassIds.length === 0) return [];

  const rows = await db
    .select({ id: threads.id })
    .from(threads)
    .where(
      and(
        inArray(
          threads.classId,
          myClassIds.map((c) => c.classId),
        ),
        eq(threads.schoolId, viewer.schoolId),
      ),
    );

  return summaries(
    viewer,
    rows.map((r) => r.id),
  );
}

/** Эцэг эхийн ярианууд — зөвхөн өөрийн хүүхдүүдийнх. */
export async function parentThreads(viewer: Viewer): Promise<ThreadSummary[]> {
  if (viewer.role !== "PARENT") throw new AccessError("ЭРХГҮЙ");

  const children = await childrenOf(viewer.userId);
  if (children.length === 0) return [];

  const rows = await db
    .select({ id: threads.id })
    .from(threads)
    .where(
      and(
        inArray(threads.studentUserId, children),
        eq(threads.schoolId, viewer.schoolId),
      ),
    );

  return summaries(
    viewer,
    rows.map((r) => r.id),
  );
}

/** Толгой дээрх тэмдэгт — бүх ярианы уншаагүйн нийлбэр. */
export async function unreadCount(viewer: Viewer): Promise<number> {
  if (viewer.role === "TEACHER") {
    return (await teacherThreads(viewer)).reduce((n, t) => n + t.unread, 0);
  }
  if (viewer.role === "PARENT") {
    return (await parentThreads(viewer)).reduce((n, t) => n + t.unread, 0);
  }
  return 0;
}
