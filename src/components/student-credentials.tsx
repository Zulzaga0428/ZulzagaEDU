"use client";

import { useState } from "react";
import { KeyRound, UserPlus, X } from "lucide-react";
import { addStudentAction, resetPinAction } from "@/app/bagsh/urilga/actions";

/**
 * Сурагчийн нэвтрэх эрх — нэмэх, PIN шинэчлэх.
 *
 * ⚠️ PIN нь **нэг л удаа** харагдана. Сан дотор hash хэлбэрээр хадгалагддаг
 * тул дахин харах арга байхгүй. Тиймээс дэлгэц дээр тод, хаахаас өмнө
 * бичиж авахыг тодорхой сануулна.
 */

type Issued = { loginCode: string; pin: string; name: string };

function CredentialCard({ data, onClose }: { data: Issued; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label={`${data.name} — нэвтрэх мэдээлэл`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              Нэвтрэх мэдээлэл
            </p>
            <p className="mt-0.5 text-lg font-extrabold text-navy">{data.name}</p>
          </div>
          <button
            type="button"
            aria-label="Хаах"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-faint"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-4 space-y-2">
          <div className="rounded-2xl bg-surface-soft px-4 py-3 text-center">
            <dt className="text-xs text-ink-faint">Нэвтрэх код</dt>
            <dd className="mt-0.5 font-mono text-2xl font-extrabold tracking-wide text-ink">
              {data.loginCode}
            </dd>
          </div>
          <div className="rounded-2xl bg-role-teacher px-4 py-3 text-center">
            <dt className="text-xs text-ink-faint">PIN</dt>
            <dd className="mt-0.5 font-mono text-3xl font-extrabold tracking-[0.3em] text-brand">
              {data.pin}
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-semibold text-ink">
          Хаахаас өмнө бичиж аваарай. PIN дахин харагдахгүй — мартвал шинээр
          үүсгэнэ.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-2xl bg-brand px-4 py-3 text-sm font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Бичиж авлаа
        </button>
      </div>
    </div>
  );
}

export function AddStudent({ classId, className }: { classId: string; className: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addStudentAction(classId, name);
      setIssued(res);
      setName("");
    } catch {
      setError("Нэмэхэд алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder={`${className} ангид сурагч нэмэх`}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={busy || name.trim().length < 2}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-ink hover:bg-brand-strong disabled:opacity-40"
        >
          <UserPlus className="h-4 w-4" strokeWidth={2.5} />
          Нэмэх
        </button>
      </form>

      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
      {issued && <CredentialCard data={issued} onClose={() => setIssued(null)} />}
    </>
  );
}

export function ResetPin({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);

  async function reset() {
    if (!confirm(`${studentName} — PIN шинээр үүсгэх үү? Хуучин PIN ажиллахаа болино.`)) return;
    setBusy(true);
    try {
      setIssued(await resetPinAction(studentId));
    } catch {
      setIssued(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink-soft hover:border-brand hover:text-brand disabled:opacity-50"
      >
        <KeyRound className="h-3.5 w-3.5" strokeWidth={2.5} />
        {busy ? "..." : "PIN"}
      </button>

      {issued && <CredentialCard data={issued} onClose={() => setIssued(null)} />}
    </>
  );
}
