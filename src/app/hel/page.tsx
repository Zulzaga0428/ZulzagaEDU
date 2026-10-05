import Link from "next/link";
import { redirect } from "next/navigation";
import { Languages } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { langEnabled } from "@/server/lang/flag";

export const dynamic = "force-dynamic";

/**
 * Хэл сурах — **баригдаж байна**.
 *
 * ⚠️ Туг (`LANG_ENABLED`) унтраалттай бол энэ хуудас байхгүйтэй адил. Прод
 * дээр унтраалттай: 2026-10-10-нд Монгол руу явах баг «хэл сурах байхгүй»
 * гэж хэлэх ёстой (`/admin/ajiltan` — амлаж болохгүй зүйлсийн жагсаалт).
 * Харагдах товч бол амлалт.
 *
 * Хөгжүүлэлтийн орчинд асаалттай — Zulzaga цааш нь барих явцдаа харна.
 *
 * `docs/DECISIONS.md` §13: төлбөртэй давхаргын хоёр нэр дэвшигчийн нэг.
 * Зардлын тооцоо: 20,000₮-ийн үнээр өдөрт 3 минутаас хэтэрч болохгүй.
 */
export default async function LanguagePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!langEnabled()) redirect("/");

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Хэл сурах"
      title="Удахгүй"
      subtitle="Энэ хэсэг баригдаж байна."
    >
      <Link href="/suragch" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <Card className="bg-role-student">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70"
          >
            <Languages className="h-6 w-6 text-brand" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-navy">Англи, солонгос, япон, хятад</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Өдөр бүр бага багаар дасгал хийх хэсэг. Хараахан бэлэн болоогүй —
              бэлэн болмогц энд гарч ирнэ.
            </p>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-ink-faint">
        Даалгавраа хийж байвал бэлтгэл нь болно.
      </p>
    </AppShell>
  );
}
