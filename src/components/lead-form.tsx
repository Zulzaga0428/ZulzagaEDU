"use client";

import { useActionState } from "react";
import { Check, Send } from "lucide-react";
import { submitLeadAction } from "@/app/holboo-barih/actions";

/**
 * Сургуулийн хүсэлтийн маягт (`docs/DECISIONS.md` §21).
 *
 * Утасны дугаар бэлэн болтол хүлээхийн оронд энэ. Захирал мэдээллээ
 * үлдээнэ, бид холбогдоно — залгасан дуудлага мартагддаг, бичигдсэн
 * хүсэлт мартагддаггүй.
 */
export function LeadForm() {
  const [result, action, pending] = useActionState(submitLeadAction, null);

  if (result?.ok) {
    return (
      <div className="rounded-3xl border-2 border-brand bg-surface p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-role-parent">
          <Check className="h-6 w-6 text-dot-parent" strokeWidth={3} />
        </span>
        <p className="mt-3 text-lg font-extrabold text-ink">Хүсэлт хүлээн авлаа</p>
        <p className="mt-1 text-sm text-ink-soft">
          Бид ойрын ажлын өдөрт тань руу залгана.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-3xl border border-line bg-surface p-5">
      {result && !result.ok && (
        <p
          role="alert"
          className="rounded-xl border border-warn-line bg-warn-bg px-3 py-2 text-sm font-bold text-ink"
        >
          {result.reason}
        </p>
      )}

      <label className="block">
        <span className="text-sm font-bold text-ink">Сургуулийн нэр</span>
        <input
          name="schoolName"
          required
          maxLength={200}
          placeholder="Номин цогцолбор сургууль"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">Таны нэр</span>
        <input
          name="contactName"
          required
          maxLength={120}
          placeholder="Сүхбаатарын Оюунчимэг"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">Утас</span>
        <input
          name="phone"
          required
          inputMode="numeric"
          maxLength={8}
          placeholder="99112233"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-faint"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">
          Нэмэлт <span className="font-normal text-ink-faint">— заавал биш</span>
        </span>
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="Хэдэн ангид туршихыг хүсэж байна, сургуульд ойролцоогоор хэдэн сурагчтай вэ"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-lg font-extrabold text-brand-ink hover:bg-brand-strong disabled:opacity-50"
      >
        <Send className="h-5 w-5" strokeWidth={2.6} />
        {pending ? "Илгээж байна…" : "Хүсэлт илгээх"}
      </button>
    </form>
  );
}
