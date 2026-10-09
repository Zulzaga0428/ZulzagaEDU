"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, TriangleAlert } from "lucide-react";
import {
  saveProfileAction,
  uploadSchoolImageAction,
  type ProfileResult,
} from "@/app/erhlegch/surguuli/actions";
import { shrink } from "@/components/photo-upload";
import type { SchoolProfile } from "@/server/school/profile";

/**
 * Эрхлэгчийн «Манай сургууль» маягт.
 *
 * Хадгалах нь хариугаа ил хэлнэ (`docs/DECISIONS.md` §24). Лого, байрны
 * зураг сонгомогц шууд хадгалагдана — тусдаа «хадгалах» дарах шаардлагагүй.
 */

const FIELD =
  "mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint";

/** Хөтөч дээр 5MB-аас хэтрэх зургийг сервер хүлээж авахгүй (`files/storage.ts`). */
const MAX_BYTES = 5 * 1024 * 1024;

function ImagePick({
  kind,
  label,
  hint,
  fileId,
  square,
}: {
  kind: "logo" | "photo";
  label: string;
  hint: string;
  fileId: string | null;
  square?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(fileId);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      /*
        Хоёулаа багасгана — сервер 1MB-аас их хүлээж авахгүй. Лого нь тунгалаг
        PNG хэвээр 512px, байрны зураг JPEG 1280px.
      */
      const body =
        kind === "photo" ? await shrink(file) : await shrink(file, { maxEdge: 512, type: "image/png" });
      if (body.size > MAX_BYTES) {
        setError("Зураг хэт том байна (5MB хүртэл).");
        return;
      }
      const data = new FormData();
      data.set("kind", kind);
      data.set(
        "photo",
        new File([body], kind === "photo" ? "bair.jpg" : "logo.png", {
          type: body === file ? file.type : kind === "photo" ? "image/jpeg" : "image/png",
        }),
      );
      const res = await uploadSchoolImageAction(data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCurrent(res.fileId);
      // Хажуугийн цэс, толгойн лого шинэчлэгдэнэ.
      router.refresh();
    } catch {
      setError("Илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="text-sm font-bold text-ink">{label}</p>
      <p className="text-xs text-ink-faint">{hint}</p>
      <div className="mt-2 flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-soft ${
            square ? "h-20 w-20" : "h-20 w-32"
          }`}
        >
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element -- эрх шалгадаг замаар ирнэ
            <img
              src={`/api/file/${current}`}
              alt={label}
              className={square ? "h-full w-full object-contain p-1.5" : "h-full w-full object-cover"}
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-ink-faint" strokeWidth={2} />
          )}
        </div>
        <label
          aria-disabled={busy}
          className={`flex cursor-pointer items-center gap-2 rounded-xl border border-brand/50 px-4 py-2.5 text-sm font-bold text-brand ${
            busy ? "opacity-60" : "hover:bg-surface-soft"
          }`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
          {busy ? "Хадгалж байна…" : current ? "Солих" : "Сонгох"}
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPick}
            disabled={busy}
            className="sr-only"
          />
        </label>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

export function SchoolProfileForm({ profile }: { profile: SchoolProfile }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ProfileResult | null, FormData>(
    saveProfileAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <ImagePick
          kind="logo"
          label="Лого"
          hint="Сургуулийн тэмдэг. Цэс, толгойд харагдана."
          fileId={profile.logoFileId}
          square
        />
        <ImagePick
          kind="photo"
          label="Байрны зураг"
          hint="Эцэг эх, багш «Манай сургууль» хэсгээс харна."
          fileId={profile.photoFileId}
        />
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-ink">Албан ёсны хаяг</span>
          <input
            name="address"
            defaultValue={profile.address ?? ""}
            maxLength={300}
            placeholder="Жишээ: Баянзүрх дүүрэг, 8-р хороо, Энхтайваны өргөн чөлөө 12"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink">Утас</span>
          <input
            name="phone"
            inputMode="tel"
            defaultValue={profile.phone ?? ""}
            maxLength={60}
            placeholder="7011 2233"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink">Вэб сайт</span>
          <input
            name="website"
            inputMode="url"
            defaultValue={profile.website ?? ""}
            maxLength={300}
            placeholder="www.school.edu.mn"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-ink">Facebook / сошиал хуудас</span>
          <input
            name="facebook"
            inputMode="url"
            defaultValue={profile.facebook ?? ""}
            maxLength={300}
            placeholder="facebook.com/manai.surguuli"
            className={FIELD}
          />
        </label>

        {state?.ok && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-line bg-role-parent px-4 py-3 text-sm font-bold text-ink"
          >
            <Check className="h-4 w-4 shrink-0 text-dot-parent" strokeWidth={3} />
            Хадгаллаа.
          </p>
        )}
        {state && !state.ok && (
          <p className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-semibold text-ink">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </form>
    </div>
  );
}
