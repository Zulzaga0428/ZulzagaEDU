"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { uploadNotebookPhoto } from "@/app/suragch/upload-actions";

/**
 * Дэвтрийн зураг илгээх товч.
 *
 * **Зургийг хөтөч дээр жижигрүүлнэ.** Утасны зураг 3–5MB байдаг, Монголын
 * мобайл датаар илгээхэд минут ярина. 1280px, JPEG 80% болгоход ихэвчлэн
 * 200KB болдог — 20 дахин хурдан, чанар нь дэвтэр уншихад хангалттай.
 *
 * `capture="environment"` нь утсан дээр шууд камер нээнэ.
 */

const MAX_EDGE = 1280;
const QUALITY = 0.8;

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
  // Жижигрүүлэлт ажиллаагүй эсвэл үр дүн нь томорсон бол эх файлаа илгээнэ.
  return blob && blob.size < file.size ? blob : file;
}

export function PhotoUpload({ homeworkId }: { homeworkId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
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
      data.set("homeworkId", homeworkId);
      data.set("photo", new File([small], "devter.jpg", { type: "image/jpeg" }));
      await uploadNotebookPhoto(data);
    } catch {
      setError("Илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="sr-only"
        id={`photo-${homeworkId}`}
      />
      <label
        htmlFor={`photo-${homeworkId}`}
        aria-disabled={busy}
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-brand/50 bg-surface px-4 py-4 text-base font-extrabold text-brand ${
          busy ? "opacity-50" : "hover:bg-surface-soft"
        }`}
      >
        <Camera className="h-5 w-5" strokeWidth={2.5} />
        {busy ? "Илгээж байна…" : "Дэвтрээ зурагдаж илгээх"}
      </label>

      {error && <p className="mt-1 text-center text-xs text-accent">{error}</p>}
    </>
  );
}
