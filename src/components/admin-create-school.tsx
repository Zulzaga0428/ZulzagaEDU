"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { createSchoolAction } from "@/app/admin/actions";

/**
 * Сургууль үүсгэх маягт.
 *
 * Клиент компонент байх ганц шалтгаан: **эрхлэгчийн PIN нэг л удаа
 * харагдана.** Түүнийг redirect-ээр дамжуулбал URL-д үлдэнэ, эсвэл алга
 * болно. Тиймээс үр дүнг дэлгэцэн дээр барьж, хуулах товч өгнө.
 *
 * Ажилтан сургуулийн коридорт утсан дээрээ ажиллана — товч томтой,
 * хуулах нь нэг дарахад болно.
 */

type Result = Awaited<ReturnType<typeof createSchoolAction>>;

export function CreateSchool() {
  const [result, action, pending] = useActionState<Result, FormData>(createSchoolAction, null);
  const [copied, setCopied] = useState(false);

  // Кирилл нэрнээс латин богино нэр санал болгоно — ажилтан бодох шаардлагагүй.
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touchedSlug, setTouchedSlug] = useState(false);

  function onName(v: string) {
    setName(v);
    if (!touchedSlug) setSlug(latinize(v));
  }

  async function copyAll() {
    if (!result?.ok) return;
    const text = [
      `${result.name}`,
      // Хатуу бичихгүй — одоо нээгдсэн сайтын хаяг. Өмнө нь `zulzagaedu.mn`
      // гэж бичигдсэн байсан нь ажиллахгүй хаяг байв (2026-10-09 зассан).
      `Хаяг: ${window.location.origin}`,
      `Эрхлэгчийн дугаар: ${result.phone}`,
      result.pin ? `PIN: ${result.pin}` : "PIN: (хуучин дугаар — өмнөх PIN хэвээр)",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Хуулах боломжгүй хөтөч байж болно — дэлгэц дээр харагдсаар байна.
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded-3xl border-2 border-brand bg-surface p-5">
        <p className="flex items-center gap-2 text-lg font-extrabold text-ink">
          <Check className="h-5 w-5 text-dot-parent" strokeWidth={3} />
          {result.name} үүслээ
        </p>

        <dl className="mt-4 space-y-2 rounded-2xl bg-surface-soft px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Эрхлэгчийн дугаар</dt>
            <dd className="font-mono font-bold text-ink">{result.phone}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">PIN</dt>
            <dd className="font-mono text-xl font-extrabold text-brand">
              {result.pin ?? "хуучин PIN хэвээр"}
            </dd>
          </div>
        </dl>

        {result.pin && (
          <p className="mt-3 rounded-xl border border-warn-line bg-warn-bg px-3 py-2 text-xs font-bold text-ink">
            ⚠️ PIN дахиж харагдахгүй. Эрхлэгчид яг одоо дамжуул.
          </p>
        )}

        <button
          type="button"
          onClick={copyAll}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          <Copy className="h-4 w-4" strokeWidth={2.6} />
          {copied ? "Хуулагдлаа" : "Мэдээллийг хуулах"}
        </button>

        <a
          href="/admin"
          className="mt-2 block rounded-2xl border border-line px-4 py-3 text-center font-bold text-brand"
        >
          Дахин нэгийг үүсгэх
        </a>
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
          name="name"
          required
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Номин цогцолбор сургууль"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">
          Богино нэр <span className="font-normal text-ink-faint">— латинаар, автоматаар</span>
        </span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setTouchedSlug(true);
            setSlug(e.target.value);
          }}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 font-mono text-ink"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">Эрхлэгчийн нэр</span>
        <input
          name="managerName"
          required
          placeholder="Сүхбаатарын Оюунчимэг"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-ink">Эрхлэгчийн утас</span>
        <input
          name="phone"
          required
          inputMode="numeric"
          maxLength={8}
          placeholder="99112233"
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-faint"
        />
        <span className="mt-1 block text-xs text-ink-faint">
          Энэ дугаар нь эрхлэгчийн нэвтрэх нэр болно.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-lg font-extrabold text-brand-ink hover:bg-brand-strong disabled:opacity-50"
      >
        <Plus className="h-5 w-5" strokeWidth={3} />
        {pending ? "Үүсгэж байна…" : "Сургууль үүсгэх"}
      </button>
    </form>
  );
}

/** Сервер талын `suggestSlug`-ийн хөнгөн хувилбар — бичиж байхад санал болгоно. */
function latinize(name: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
    и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "u", п: "p",
    р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return name
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
