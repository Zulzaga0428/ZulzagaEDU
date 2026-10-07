"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { createHomeworkAction, type CreateResult } from "@/app/bagsh/actions";
import { BoardPhoto } from "@/components/board-photo";
import { HomeworkDraft, clearAllDrafts } from "@/components/homework-draft";

/**
 * Даалгавар өгөх маягт.
 *
 * ⚠️ Клиент компонент байх шалтгаан (`docs/DECISIONS.md` §24): серверийн
 * үйлдэл дээр найдсан `<form action>` нь **чимээгүй бүтэлгүйтдэг** байв —
 * даалгавар үүсдэг ч хуудас хөдөлдөггүй, багш дахин дарж хоёр ижил даалгавар
 * үүсгэдэг. Жинхэнэ хөтчөөр батлагдсан.
 *
 * Тиймээс гурван зүйл ил болов:
 *
 *   1. Илгээж байх хугацаанд товч **хаагдана** — хоёр дахин дарах зам байхгүй
 *   2. Бүтсэн тохиолдолд л хуудас солигдож, ноорог цэвэрлэгдэнэ
 *   3. Бүтээгүй бол шалтгаан нь дэлгэцэн дээр гарна, багшийн текст хэвээр
 *
 * Зорилтот хэмжүүр хэвээр: **30 секундээс богино** (`docs/ROADMAP.md`).
 */

export type ClassOption = { id: string; name: string };
export type SubjectOption = { id: string; name: string };

export function NewHomeworkForm({
  classes,
  subjects,
  tomorrow,
  today,
}: {
  classes: ClassOption[];
  subjects: SubjectOption[];
  tomorrow: string;
  today: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateResult | null, FormData>(
    createHomeworkAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    /*
      Бүтсэн — одоо л ноорог хэрэггүй. Хуудас солихоос ӨМНӨ цэвэрлэнэ, эс
      бөгөөс багш дараагийн даалгавраа бичихээр ороход өмнөхийн текст санал
      болгож, давхар даалгавар үүсгэх зам нээгдэнэ.
    */
    clearAllDrafts();
    router.push("/bagsh");
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5">
      {classes.length === 1 ? (
        <input type="hidden" name="classId" value={classes[0].id} />
      ) : (
        <label className="block">
          <span className="text-sm font-bold text-ink">Анги</span>
          <select
            name="classId"
            required
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="text-sm font-bold text-ink">
          Хичээл <span className="font-normal text-ink-faint">— заавал биш</span>
        </span>
        <select
          name="subjectId"
          defaultValue=""
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
        >
          <option value="">— сонгох —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {/*
        Самбар нь эхний сонголт — бичихээс хурдан. Багш аль хэдийн самбар
        дээр бичсэн байдаг (`docs/DECISIONS.md` §16).
      */}
      <BoardPhoto />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-bold text-ink-faint">эсвэл бичих</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* Бичсэн зүйл алдагдахгүй болгоно — §24. */}
      <HomeworkDraft classId={classes[0].id} />

      <label className="block">
        <span className="text-sm font-bold text-ink">
          Юу хийх вэ <span className="font-normal text-ink-faint">— зурагтай бол заавал биш</span>
        </span>
        <input
          name="title"
          maxLength={200}
          placeholder="Жишээ: 42–48-р дасгал"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">
          Тайлбар <span className="font-normal text-ink-faint">— заавал биш</span>
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Нэмэлт заавар байвал энд бич."
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">Хэзээ хүртэл</span>
        <input
          type="date"
          name="dueDate"
          required
          defaultValue={tomorrow}
          min={today}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
        />
        <span className="mt-1 block text-xs text-ink-faint">Тухайн өдрийн 23:59 цаг хүртэл.</span>
      </label>

      {/* Бүтэлгүйтвэл шалтгаан нь энд. Хоосон дэлгэц рүү хэзээ ч шиднэхгүй. */}
      {state && !state.ok && (
        <p className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-semibold text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-5 text-lg font-extrabold text-brand-ink shadow-[0_10px_24px_rgba(43,133,246,0.28)] hover:bg-brand-strong disabled:opacity-60"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />}
        {pending ? "Илгээж байна…" : "Илгээх"}
      </button>

      <p className="text-center text-xs text-ink-faint">
        Илгээмэгц ангийн бүх сурагч, эцэг эхэд харагдана.
      </p>
    </form>
  );
}
