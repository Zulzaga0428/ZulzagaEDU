"use client";

import { useState } from "react";
import { QrCode, X } from "lucide-react";
import { makeParentInvite } from "@/app/bagsh/urilga/actions";

/**
 * «QR гаргах» товч.
 *
 * QR-ыг зөвхөн дарсан үед үүсгэнэ — 24 сурагчийн урилгыг урьдчилж бэлдвэл
 * 24 хүчинтэй токен хэрэггүйгээр санд хэвтэнэ.
 *
 * Багш утсаараа харуулж, эцэг эх өөрийн утсаараа уншина. Линкийг хуулж
 * Messenger-ээр илгээх ч боломжтой — эцэг эх тэнд байдаг.
 */
export function InviteButton({
  classId,
  studentId,
  studentName,
}: {
  classId: string;
  studentId: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function show() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await makeParentInvite(classId, studentId);
      setUrl(window.location.origin + res.path);
      setSvg(res.svg);
      setOpen(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-soft px-3 py-1.5 text-xs font-bold text-brand hover:bg-role-teacher disabled:opacity-50"
      >
        <QrCode className="h-3.5 w-3.5" strokeWidth={2.5} />
        {busy ? "..." : "Урилга"}
      </button>

      {failed && <span className="text-xs text-accent">Алдаа гарлаа</span>}

      {open && url && (
        <div
          role="dialog"
          aria-label={`${studentName} — эцэг эхийн урилга`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent">
                  Эцэг эхийн урилга
                </p>
                <p className="mt-0.5 text-lg font-extrabold text-navy">{studentName}</p>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-faint"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/*
              QR нь сервер дээр зурагдаж SVG болж ирнэ. Гадны үйлчилгээ рүү
              токен явуулахгүй.
            */}
            <div
              className="mt-4 flex justify-center rounded-2xl bg-white p-4 [&>svg]:h-56 [&>svg]:w-56"
              aria-label="QR код"
              dangerouslySetInnerHTML={{ __html: svg ?? "" }}
            />

            <p className="mt-3 break-all rounded-xl bg-surface-soft px-3 py-2 text-center text-xs text-ink-soft">
              {url}
            </p>

            <button
              type="button"
              onClick={copy}
              className="mt-3 w-full rounded-2xl bg-brand px-4 py-3 text-sm font-extrabold text-brand-ink hover:bg-brand-strong"
            >
              {copied ? "Хуулагдлаа ✓" : "Линкийг хуулах"}
            </button>

            <p className="mt-3 text-center text-xs text-ink-faint">
              7 хоног хүчинтэй. Хоёр хүн ашиглаж болно (ээж, аав).
            </p>
          </div>
        </div>
      )}
    </>
  );
}
