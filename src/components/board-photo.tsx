"use client";

import { useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import { uploadBoardPhoto } from "@/app/bagsh/upload-actions";

/**
 * Багшийн самбарын зураг.
 *
 * Энэ бол аппын гол санаа: багш самбар дээр аль хэдийн бичсэн, дахин
 * бичих ёсгүй (`docs/DECISIONS.md` §16). Зурагдах нь 3 секунд.
 *
 * Сурагчийн `PhotoUpload`-оос ялгаатай нь даалгавар хараахан БАЙХГҮЙ:
 * эхлээд зураг байршуулж `fileId` авна, түүнийгээ нуулт талбарт хийнэ,
 * дараа нь багш формоо илгээнэ.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  return blob && blob.size < file.size ? blob : file;
}

export function BoardPhoto() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileId, setFileId] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const small = await shrink(file);
      const data = new FormData();
      data.set("photo", new File([small], "sambar.jpg", { type: "image/jpeg" }));
      const { fileId: id } = await uploadBoardPhoto(data);
      setFileId(id);
      setPreview(URL.createObjectURL(small));
    } catch {
      setError("Зураг илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clear() {
    setFileId("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  return (
    <div>
      <input type="hidden" name="boardFileId" value={fileId} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="sr-only"
        id="board-photo"
      />

      {preview ? (
        <div className="rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm font-bold text-dot-parent">
              <Check className="h-4 w-4" strokeWidth={3} />
              Самбарын зураг бэлэн
            </span>
            <button
              type="button"
              onClick={clear}
              className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-ink-faint hover:border-accent hover:text-accent"
            >
              <X className="h-3.5 w-3.5" strokeWidth={3} />
              Болих
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Сонгосон самбарын зураг"
            className="mt-3 w-full rounded-xl border border-line object-contain"
          />
        </div>
      ) : (
        <label
          htmlFor="board-photo"
          aria-disabled={busy}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-brand/50 bg-surface px-4 py-4 text-base font-extrabold text-brand ${
            busy ? "opacity-50" : "hover:bg-surface-soft"
          }`}
        >
          <Camera className="h-5 w-5" strokeWidth={2.5} />
          {busy ? "Илгээж байна…" : "Самбараа зурагдах"}
        </label>
      )}

      {error && <p className="mt-1 text-center text-xs text-accent">{error}</p>}
    </div>
  );
}
