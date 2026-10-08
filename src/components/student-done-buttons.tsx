"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Star } from "lucide-react";
import {
  markDoneAction,
  undoDoneAction,
  type DoneResult,
  type UndoResult,
} from "@/app/suragch/actions";

/**
 * Хүүхдийн «хийчихлээ» товч.
 *
 * ⚠️ Яагаад клиент тал вэ (`docs/DECISIONS.md` §18, §24): 2026-10-09 хүртэл
 * хүүхэд дарахад юу ч болдоггүй байв — оноо хадгалагддаг ч 8 секундын дараа
 * ч дэлгэц хөдөлдөггүй. 7 настай хүүхдэд шагнал ШУУД байх ёстой, эс бөгөөс
 * дахин дахин дарж, эсвэл итгэхээ болино.
 *
 * Дарахад: товч тэр дор хаагдана → «+10 оноо!» хэсэг харагдана → дараа нь
 * хуудас шинэчлэгдэж карт «Хийсэн» рүү шилжиж, толгойн оноо өснө.
 *
 * Шагналын мөчийг хэсэг саатуулдаг нь зориуд: шууд шинэчилбэл карт алга болж,
 * хүүхэд «+10»-ыг огт харахгүй. Харагдах байдал (өнгө, хөдөлгөөн) нь Zulzaga-гийн
 * шийдэх зүйл — одоо зөвхөн ажилладаг болгосон.
 */

/** Шагналыг харуулах хугацаа — дараа нь карт «Хийсэн» рүү шилжинэ. */
const CELEBRATE_MS = 1400;

export function DoneButton({ homeworkId }: { homeworkId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<DoneResult | null, FormData>(
    markDoneAction,
    null,
  );
  useEffect(() => {
    if (!state?.ok) return;
    // Шагналыг харуулсны ДАРАА шинэчилнэ — карт «Хийсэн» рүү шилжинэ.
    const t = setTimeout(() => router.refresh(), CELEBRATE_MS);
    return () => clearTimeout(t);
  }, [state, router]);

  // Шагналын мөч нь хариунаас шууд гарна — тусдаа төлөв хадгалах шаардлагагүй.
  if (state?.ok) {
    return (
      <div
        role="status"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-role-parent px-4 py-4 text-base font-extrabold text-dot-parent"
      >
        {state.gained > 0 ? (
          <>
            <Star className="h-5 w-5 fill-current" strokeWidth={2.4} />+{state.gained} оноо!
          </>
        ) : (
          <>
            <Check className="h-5 w-5" strokeWidth={3} />
            Хийсэн гэж тэмдэглэлээ
          </>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-2">
      <input type="hidden" name="homeworkId" value={homeworkId} />
      {state && !state.ok && (
        <p className="mb-2 text-center text-sm font-semibold text-accent">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong disabled:opacity-60"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />}
        {pending ? "Хадгалж байна…" : "Зураггүй хийчихлээ"}
      </button>
    </form>
  );
}

/** «Андуурч дарсан — буцаах». Ижил шалтгаанаар хариугаа ил харуулна. */
export function UndoButton({ homeworkId }: { homeworkId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<UndoResult | null, FormData>(
    undoDoneAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="mt-2">
      <input type="hidden" name="homeworkId" value={homeworkId} />
      <button
        type="submit"
        disabled={pending || state?.ok === true}
        className="text-xs font-bold text-ink-faint underline hover:text-accent disabled:no-underline disabled:opacity-60"
      >
        {pending || state?.ok ? "Буцааж байна…" : "Андуурч дарсан — буцаах"}
      </button>
      {state && !state.ok && <p className="mt-1 text-xs text-accent">{state.error}</p>}
    </form>
  );
}
