"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { sendMessageAction, type SendResult } from "@/app/yaria/actions";

/**
 * Ярианы мессеж бичих мөр.
 *
 * ⚠️ Яагаад клиент тал вэ (`docs/DECISIONS.md` §24): энэ маягт мессежийг
 * хадгалаад ярианд нэмдэггүй, бичсэн текстийг ч талбарт үлдээдэг байв.
 * Чат мэт харагддаг зүйл илгээснээ харуулахгүй бол багш, эцэг эх хоёулаа
 * дахин бичнэ — нөгөө талдаа хоёр ижил мессеж очно.
 *
 * Товч илгээх хугацаанд хаагдана: нэг мессеж хоёр удаа явах зам байхгүй.
 */
export function MessageForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const box = useRef<HTMLTextAreaElement | null>(null);
  const [state, formAction, pending] = useActionState<SendResult | null, FormData>(
    sendMessageAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    if (box.current) box.current.value = "";
    // Ярианы жагсаалтыг сэргээнэ — илгээсэн мессеж нь энд гарч ирнэ.
    router.refresh();
  }, [state, router]);

  return (
    <div className="space-y-2">
      {state && !state.ok && (
        <p className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-semibold text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
          {state.error}
        </p>
      )}

      <form action={formAction} className="flex items-end gap-2">
        <input type="hidden" name="threadId" value={threadId} />
        <textarea
          ref={box}
          name="body"
          required
          rows={2}
          maxLength={2000}
          placeholder="Мессеж бичих…"
          className="min-w-0 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-brand px-5 py-3.5 font-extrabold text-brand-ink hover:bg-brand-strong disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
          Илгээх
        </button>
      </form>
    </div>
  );
}
