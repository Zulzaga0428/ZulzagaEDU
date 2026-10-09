"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Star } from "lucide-react";
import { setHomeroomAction, type HomeroomResult } from "@/app/erhlegch/bagsh/actions";

/**
 * Анги удирдсан багш сонгох — эрхлэгчийн «Багш ба анги» хуудсан дээр.
 *
 * Анги удирдсан багш эцэг эхтэй холбоотой бүх зүйлийг хариуцна (яриа,
 * хүсэлт батлах, QR урилга, мэдэгдэл). Хичээлийн багш нар зөвхөн даалгавар.
 * Сонгоогүй бол ангийн бүх багш өмнөх шигээ.
 */
export function HomeroomPicker({
  classId,
  teachers,
  current,
}: {
  classId: string;
  teachers: { id: string; name: string }[];
  current: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<HomeroomResult | null, FormData>(
    setHomeroomAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const currentName = teachers.find((t) => t.id === current)?.name;

  return (
    <form action={formAction} className="mt-3 rounded-2xl bg-surface-soft p-3">
      <input type="hidden" name="classId" value={classId} />
      <p className="flex items-center gap-1.5 text-xs font-bold text-ink">
        <Star className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
        Анги удирдсан багш
        {currentName ? (
          <span className="font-extrabold text-brand">— {currentName}</span>
        ) : (
          <span className="font-normal text-ink-faint">— сонгоогүй</span>
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-faint">
        Эцэг эхтэй яриа, хүсэлт батлах, урилга — зөвхөн энэ багш. Бусад нь зөвхөн
        даалгавар өгнө. Сонгоогүй бол бүх багш.
      </p>
      <div className="mt-2 flex gap-2">
        {/*
          React 19 action-ийн дараа маягтыг АНХНЫ утга руу нь буцаадаг — `key`
          нь refresh-ийн дараа шинэ сонголтоор дахин зурна.
        */}
        <select
          key={current ?? "none"}
          name="teacherUserId"
          defaultValue={current ?? ""}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">— сонгоогүй (бүх багш) —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-strong disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
          Хадгалах
        </button>
      </div>
      {state?.ok && (
        <p role="status" className="mt-1.5 flex items-center gap-1 text-xs font-bold text-dot-parent">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Хадгаллаа
        </p>
      )}
      {state && !state.ok && <p className="mt-1.5 text-xs font-semibold text-accent">{state.error}</p>}
    </form>
  );
}
