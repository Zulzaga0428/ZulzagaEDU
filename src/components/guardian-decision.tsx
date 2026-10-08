"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { approveGuardianAction, type DecideResult } from "@/app/bagsh/urilga/actions";

/**
 * Эцэг эхийн хүсэлтийг батлах / татгалзах.
 *
 * ⚠️ Клиент тал (`docs/DECISIONS.md` §24): өмнө нь дарахад хадгалагддаг ч
 * хүсэлт жагсаалтаас гардаггүй байв — багш дахин дарна, эсвэл эвдэрсэн гэж
 * бодно. Одоо: дарсан даруйд хоёр товч хоёулаа хаагдана (хоёр өөр шийдвэр
 * зэрэг явах зам байхгүй), дуусмагц хариугаа хэлж, жагсаалт шинэчлэгдэнэ.
 */
export function GuardianDecision({ guardianId }: { guardianId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<DecideResult | null, FormData>(
    approveGuardianAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    // Хариуг эхэлж харуулна, ДАРАА нь карт жагсаалтаас гарна.
    const t = setTimeout(() => router.refresh(), 1200);
    return () => clearTimeout(t);
  }, [state, router]);

  if (state?.ok) {
    return (
      <p
        role="status"
        className="mt-3 flex items-center gap-2 rounded-xl bg-role-parent px-4 py-2.5 text-sm font-bold text-dot-parent"
      >
        {state.approved ? (
          <>
            <Check className="h-4 w-4" strokeWidth={3} />
            Батлагдлаа — эцэг эхэд мэдэгдэл очлоо
          </>
        ) : (
          <>
            <X className="h-4 w-4" strokeWidth={3} />
            Татгалзлаа
          </>
        )}
      </p>
    );
  }

  /*
    Хоёр товч нэг маягт дотор — `decision`-ийг дарсан товч өөрөө илгээнэ.
    Тиймээс `pending` хоёуланг нь зэрэг хаана.
  */
  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="guardianId" value={guardianId} />
      {state && !state.ok && <p className="mb-2 text-xs text-accent">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="ACTIVE"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-brand-strong disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />}
          Батлах
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECTED"
          disabled={pending}
          className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink-soft hover:border-accent hover:text-accent disabled:opacity-60"
        >
          Татгалзах
        </button>
      </div>
    </form>
  );
}
