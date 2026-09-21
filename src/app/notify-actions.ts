"use server";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { pushSubscriptions } from "@/server/db/schema";
import { requireViewer } from "@/server/auth/access";

/**
 * Төхөөрөмжийн push захиалгыг хадгална.
 *
 * Нэг хүн олон төхөөрөмжтэй байж болно тул `endpoint` бүрд нэг мөр.
 * Ижил endpoint дахин ирвэл эзнийг нь шинэчилнэ — утас гар дамжсан байж
 * болно.
 */
export async function saveSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const viewer = await requireViewer();

  await db
    .insert(pushSubscriptions)
    .values({
      userId: viewer.userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: viewer.userId, p256dh: sub.p256dh, auth: sub.auth, lastSeenAt: new Date() },
    });
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await requireViewer();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
