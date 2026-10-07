"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { postAnnouncementAction, type PostResult } from "@/app/bagsh/zarlal/actions";

/**
 * Зарлал бичих маягт.
 *
 * ⚠️ Яагаад клиент компонент вэ (`docs/DECISIONS.md` §24): энэ маягт
 * 2026-10-07 хүртэл зарлалыг **хадгалаад**, эцэг эх рүү мэдэгдэл явуулаад,
 * хөтчийг хөдөлгөдөггүй байв — бичсэн текст талбарт үлдэж, багш «болоогүй»
 * гэж бодоод дахин дарвал ангийн бүх эцэг эхэд **хоёр ижил зарлал, хоёр
 * мэдэгдэл** очно. Жинхэнэ хөтчөөр хэмжиж баталсан.
 *
 * Тиймээс: илгээж байхад товч хаагдана, бүтсэн бол талбар цэвэрлэгдэж
 * баталгаа гарна, бүтээгүй бол шалтгаан гарна.
 */

const AUDIENCE_LABEL = { ALL: "Бүгд", PARENTS: "Эцэг эх", STUDENTS: "Сурагч" } as const;

export function AnnounceForm({ classId, className }: { classId: string; className: string }) {
  const router = useRouter();
  const box = useRef<HTMLTextAreaElement | null>(null);
  const [state, formAction, pending] = useActionState<PostResult | null, FormData>(
    postAnnouncementAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    /*
      Бүтсэн: талбарыг цэвэрлэнэ — үлдээвэл дахин дарах зам нээлттэй хэвээр.
      `refresh` нь доорх жагсаалтыг шинэчилж, багш зарлалаа тэр дор нь харна.
    */
    if (box.current) box.current.value = "";
    router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="className" value={className} />

      {state?.ok && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-line bg-role-parent px-4 py-3 text-sm font-bold text-ink"
        >
          <Check className="h-4 w-4 shrink-0 text-dot-parent" strokeWidth={3} />
          Илгээгдлээ. Утсанд нь мэдэгдэл очлоо.
        </p>
      )}

      {state && !state.ok && (
        <p className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-semibold text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
          {state.error}
        </p>
      )}

      <textarea
        ref={box}
        name="body"
        required
        rows={4}
        maxLength={2000}
        placeholder="Жишээ: Маргааш 10:00 цагт эцэг эхийн хурал болно."
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
      />

      <fieldset>
        <legend className="text-sm font-bold text-ink">Хэнд</legend>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(["ALL", "PARENTS", "STUDENTS"] as const).map((a, i) => (
            <label
              key={a}
              className="flex cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-2 py-2.5 text-center text-sm font-bold text-ink has-[:checked]:border-brand has-[:checked]:bg-role-teacher has-[:checked]:text-brand"
            >
              <input
                type="radio"
                name="audience"
                value={a}
                defaultChecked={i === 0}
                className="sr-only"
              />
              {AUDIENCE_LABEL[a]}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
        {pending ? "Илгээж байна…" : "Илгээх"}
      </button>

      <p className="text-center text-xs text-ink-faint">
        Зарлал нь нэг талын мэдээлэл — хариу бичих боломжгүй.
      </p>
    </form>
  );
}
