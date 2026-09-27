import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Empty, SectionLabel } from "@/components/ui";
import { parentThreads, teacherThreads, type ThreadSummary } from "@/server/thread/service";
import { formatDueUb } from "@/server/homework/time";

export const dynamic = "force-dynamic";

/**
 * Ярианы жагсаалт — багш, эцэг эх хоёрт НЭГ хуудас.
 *
 * Эрхийг service давхарга шийддэг тул дүр бүрд тусдаа хуудас хэрэггүй.
 * Хүүхэд, эрхлэгч энд орохгүй (`docs/DECISIONS.md` §17).
 */

function Row({ t }: { t: ThreadSummary }) {
  return (
    <Link
      href={`/yaria/${t.id}`}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-role-parent text-sm font-extrabold text-ink"
      >
        {t.studentName.trim().split(/\s+/).pop()?.[0] ?? "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-bold text-ink">{t.studentName}</span>
          <span className="shrink-0 text-xs text-ink-faint">{t.className}</span>
        </span>
        <span className="block truncate text-xs text-ink-faint">
          {t.preview ?? "Мессеж алга"}
        </span>
      </span>
      {t.unread > 0 && (
        <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-extrabold text-brand-ink">
          {t.unread}
        </span>
      )}
    </Link>
  );
}

export default async function ThreadListPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER" && viewer.role !== "PARENT") redirect("/");

  const list =
    viewer.role === "TEACHER" ? await teacherThreads(viewer) : await parentThreads(viewer);

  const withMessages = list.filter((t) => t.lastMessageAt !== null);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Яриа"
      title="Яриа"
      subtitle={
        viewer.role === "TEACHER"
          ? "Эцэг эхтэй хүүхэд тус бүрээр."
          : "Хүүхдийнхээ багштай."
      }
    >
      <Link
        href={viewer.role === "TEACHER" ? "/bagsh" : "/etseg-eh"}
        className="text-sm font-bold text-brand hover:underline"
      >
        ← Буцах
      </Link>

      {withMessages.length === 0 ? (
        <Empty icon={MessageSquare}>
          {viewer.role === "TEACHER"
            ? "Одоогоор яриа алга. «Сурагч ба эцэг эх» хэсгээс эхлүүлж болно."
            : "Одоогоор яриа алга. Хүүхдийнхээ хуудаснаас эхлүүлнэ."}
        </Empty>
      ) : (
        <section>
          <SectionLabel>Яриа · {withMessages.length}</SectionLabel>
          <div className="space-y-2">
            {withMessages.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-ink-faint">
        Багш ангийнхаа цагаар хариулна. Яаралтай бол сургууль руугаа залгаарай.
      </p>

      {withMessages.length > 0 && (
        <p className="text-center text-xs text-ink-faint">
          Сүүлд: {formatDueUb(withMessages[0].lastMessageAt ?? new Date())}
        </p>
      )}
    </AppShell>
  );
}
