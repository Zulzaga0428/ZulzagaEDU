"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";

/**
 * Багшийн бичсэн зүйлийг алдуулахгүй болгоно.
 *
 * ⚠️ Яагаад энэ байдаг вэ (`docs/DECISIONS.md` §24): жинхэнэ багшийн ESIS,
 * Их нүүдлийн талаарх цорын ганц гомдол нь *«хийж байсан ажлууд бүгд ул
 * мөргүй алга болчихдог»* байсан. Бид ижил алдаатай байв — маягт нь жирийн
 * server action, тиймээс:
 *
 *   · байршуулалт дундуур орвол action-ы id хуучирч 500 буцаана
 *   · сүлжээ тасарвал илгээлт унана
 *   · PIN-ийн хугацаа дуусвал нэвтрэх хуудас руу шиднэ
 *
 * Гурвуулаа хуудсыг дахин ачаалж, багшийн 5 минут бичсэн зүйлийг устгадаг.
 * Одоо текст нь хөтөч дотор хадгалагдаж, дараа нь **санал болгож** сэргээнэ.
 *
 * Чимээгүй сэргээхгүй — банner-аар асууна. Чимээгүй бөглөвөл багш өмнөх
 * даалгавраа дахин илгээж, хүүхдэд хоёр ижил даалгавар харагдана.
 */

type Draft = { title: string; description: string; at: number };

/** Хуучин ноорог хэрэггүй — өнгөрсөн долоо хоногийн текст нь зөвхөн будлиан. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Анги тутамд тусдаа — хоёр ангийн ноорог хутгалдаж болохгүй. */
function keyFor(classId: string) {
  return `zedu.hw-draft.v1.${classId}`;
}

/*
  Хөтчийн хадгалалт байхгүй байж болно: нууц цонх, сайтын өгөгдөл хаасан,
  квот дүүрсэн. Тэр тохиолдолд уншилт, бичилт шидэж унадаг тул бүгдийг
  try/catch дотор хийнэ. Ноорог байхгүй байх нь ажиллахгүй байхаас дээр.
*/
function readDraft(classId: string): Draft | null {
  try {
    const raw = localStorage.getItem(keyFor(classId));
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (typeof d?.at !== "number" || Date.now() - d.at > MAX_AGE_MS) return null;
    if (!d.title?.trim() && !d.description?.trim()) return null;
    return d;
  } catch {
    return null;
  }
}

function writeDraft(classId: string, d: Draft) {
  try {
    localStorage.setItem(keyFor(classId), JSON.stringify(d));
  } catch {
    /* хадгалж чадсангүй — маягт хэвийн ажиллана */
  }
}

export function clearDraft(classId: string) {
  try {
    localStorage.removeItem(keyFor(classId));
  } catch {
    /* хамаагүй */
  }
}

/** Бүх ангийн ноорог. Илгээлт бүтсэний дараа аль анги болохыг нь мэдэхгүй. */
export function clearAllDrafts() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith("zedu.hw-draft.v1.")) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* хамаагүй */
  }
}

/**
 * Маягтын ДОТОР тавина. Эргэн тойрныхоо `form`-ыг өөрөө олж, `title` ба
 * `description` талбарыг хөтөч дотор тольдоно.
 */
export function HomeworkDraft({ classId }: { classId: string }) {
  const anchor = useRef<HTMLDivElement | null>(null);
  const [found, setFound] = useState<Draft | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    const title = form.elements.namedItem("title") as HTMLInputElement | null;
    const description = form.elements.namedItem("description") as HTMLTextAreaElement | null;
    if (!title && !description) return;

    // Бичсэн зүйл байвал санал болгоно. Талбар дүүрэн байхад оролцохгүй.
    const existing = readDraft(classId);
    if (existing && !title?.value.trim() && !description?.value.trim()) setFound(existing);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onInput = () => {
      clearTimeout(timer);
      // Товшилт бүрд бичихгүй — 400мс тайвширсан хойно.
      timer = setTimeout(() => {
        writeDraft(classId, {
          title: title?.value ?? "",
          description: description?.value ?? "",
          at: Date.now(),
        });
      }, 400);
    };

    form.addEventListener("input", onInput);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", onInput);
    };
  }, [classId]);

  function restore() {
    const form = anchor.current?.closest("form");
    const title = form?.elements.namedItem("title") as HTMLInputElement | null;
    const description = form?.elements.namedItem("description") as HTMLTextAreaElement | null;
    if (title && found) title.value = found.title;
    if (description && found) description.value = found.description;
    setFound(null);
    setDone(true);
  }

  function discard() {
    clearDraft(classId);
    setFound(null);
  }

  return (
    <div ref={anchor}>
      {found && (
        <div className="rounded-2xl border border-warn-line bg-warn-bg px-4 py-3">
          <p className="text-sm font-bold text-ink">Өмнө бичиж байсан зүйл байна</p>
          <p className="mt-0.5 truncate text-sm text-ink-soft">
            {found.title.trim() || found.description.trim()}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={restore}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-brand-strong"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
              Сэргээх
            </button>
            <button
              type="button"
              onClick={discard}
              className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink-soft hover:border-brand"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
              Хэрэггүй
            </button>
          </div>
        </div>
      )}
      {done && <p className="text-xs font-semibold text-dot-parent">Бичсэн зүйл сэргээгдлээ.</p>}
    </div>
  );
}
