"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { saveWeekAction, type SaveResult } from "@/app/bagsh/hovaari/actions";

/**
 * Хуваарийн маягтын бүрхүүл.
 *
 * ⚠️ Зөвхөн бүрхүүл нь клиент тал — долоо хоногийн сүлжээ нь `children`-ээр
 * серверээс ирнэ. Ингэснээр 5 өдөр × 8 цагийн нүднүүд хөтөч руу javascript
 * болж буухгүй, гэхдээ илгээлтийн төлөв нь ил болно (`docs/DECISIONS.md` §24).
 *
 * Хадгалсны дараа `refresh` — хуудасны дээрх «одоо хадгалагдсан» тойм нь
 * багшийн үр дүнг харуулдаг цорын ганц газар, тиймээс тэр шинэчлэгдэх ёстой.
 */
export function SaveWeekForm({
  classId,
  children,
}: {
  classId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaveResult | null, FormData>(
    saveWeekAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4 pb-24">
      <input type="hidden" name="classId" value={classId} />
      {children}

      {/*
        Товч нь үргэлж хүрэх зайд — 42 сонголтыг гүйлгэж дуусгах шаардлагагүй.
        Доод nav-ын ЯГ ДЭЭР суух ёстой: `bottom-0` үлдээвэл nav-ыг бүрэн дарж,
        багш хуваариас гарч чадахгүй болно.
      */}
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-[480px]">
          {state && !state.ok && (
            <p className="mb-2 flex items-start gap-2 rounded-xl border border-warn-line bg-warn-bg px-3 py-2 text-xs font-semibold text-ink">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-3">
            {state?.ok && (
              <span
                role="status"
                className="flex shrink-0 items-center gap-1 text-xs font-bold text-dot-parent"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                Хадгалсан
              </span>
            )}
            <button
              type="submit"
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
              {pending ? "Хадгалж байна…" : "Хадгалах"}
            </button>
          </div>
        </div>
      </div>

      {/* Хамгийн сүүлийн сонголт хоёр самбарын доор нуугдахгүйн тулд. */}
      <div aria-hidden className="h-16" />
    </form>
  );
}
