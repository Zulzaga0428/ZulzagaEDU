"use client";

import { useEffect, useState } from "react";
import { saveSubscription } from "@/app/notify-actions";

/**
 * Мэдэгдэл асаах урилга.
 *
 * Хоёр тусдаа зүйлийг ялгаж харуулна:
 *
 *  1. **iPhone дээр дэлгэцэн дээрээ нэмээгүй** — энэ тохиолдолд зөвшөөрөл
 *     асуух товч огт ажиллахгүй. Apple standalone горимоос гадуур web push
 *     өгдөггүй. Тиймээс товч биш, ЗААВАР харуулна.
 *  2. Бусад тохиолдолд — энгийн зөвшөөрлийн товч.
 *
 * Энэ ялгааг гаргахгүй бол iPhone-той эцэг эх товч дараад юу ч болохгүй,
 * дараа нь «мэдэгдэл ирэхгүй байна» гэж гомдоно.
 */

type Phase = "шалгаж" | "болохгүй" | "ios-нэмэх" | "асаах" | "асаасан" | "татгалзсан" | "алдаа";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari-гийн өөрийн туг.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function EnableNotifications({ vapidKey }: { vapidKey: string | null }) {
  const [phase, setPhase] = useState<Phase>("шалгаж");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!vapidKey) return setPhase("болохгүй");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setPhase(isIos() && !isStandalone() ? "ios-нэмэх" : "болохгүй");
      }
      if (isIos() && !isStandalone()) return setPhase("ios-нэмэх");

      if (Notification.permission === "denied") return setPhase("татгалзсан");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      if (cancelled) return;
      setPhase(existing && Notification.permission === "granted" ? "асаасан" : "асаах");
    })().catch(() => setPhase("алдаа"));

    return () => {
      cancelled = true;
    };
  }, [vapidKey]);

  async function enable() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setPhase("татгалзсан");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
      });

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
      if (!json.endpoint || !json.keys) return setPhase("алдаа");

      await saveSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      setPhase("асаасан");
    } catch {
      setPhase("алдаа");
    }
  }

  if (phase === "шалгаж" || phase === "асаасан" || phase === "болохгүй") return null;

  if (phase === "ios-нэмэх") {
    return (
      <div className="mt-3 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-ink-soft">
        <strong className="font-bold text-ink">Мэдэгдэл авахын тулд</strong> доорх{" "}
        <span aria-hidden>⬆️</span> хуваалцах товчийг дараад{" "}
        <strong className="text-ink">«Дэлгэцэнд нэмэх»</strong> гэснийг сонгоно уу. iPhone дээр
        өөр аргаар мэдэгдэл ирдэггүй.
      </div>
    );
  }

  if (phase === "татгалзсан") {
    return (
      <div className="mt-3 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-ink-soft">
        Мэдэгдэл хаалттай байна. Хөтчийн тохиргооноос энэ сайтад зөвшөөрөл өгнө үү.
      </div>
    );
  }

  if (phase === "алдаа") {
    return (
      <div className="mt-3 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-ink-soft">
        Мэдэгдэл асаахад алдаа гарлаа. Дараа дахин оролдоно уу.
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand/50 bg-surface px-4 py-3 text-sm font-bold text-brand hover:bg-surface-soft"
    >
      🔔 Шинэ даалгаврын мэдэгдэл авах
    </button>
  );
}
