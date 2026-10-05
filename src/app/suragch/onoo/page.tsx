import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, NotebookPen, Sparkles, Star } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, IconBox, SectionLabel } from "@/components/ui";
import { Avatar } from "@/components/avatars";
import {
  POINTS_COMEBACK,
  POINTS_HOMEWORK_DONE,
  POINTS_PHOTO,
  myHistory,
  myPoints,
  pointsEnabled,
} from "@/server/points/service";
import { avatarCatalog, selectedAvatar } from "@/server/points/avatars";

export const dynamic = "force-dynamic";

/**
 * Миний оноо — хаанаас цуглаад байгааг харуулна.
 *
 * Онооны карт нүүрэн дээр тоо л хэлнэ. Хүүхэд «яагаад ийм оноотой байна вэ»
 * гэж асуувал хариулах газар хэрэгтэй — дэвтрийн зарчмын бүх учир тэнд
 * (`docs/DECISIONS.md` §18).
 *
 * ⚠️ Тугийн ард. Унтраалттай бол энэ хуудас байхгүйтэй адил.
 */

const REASONS: Record<string, { label: string; icon: typeof Star }> = {
  HOMEWORK_DONE: { label: "Даалгавраа хийсэн", icon: NotebookPen },
  PHOTO: { label: "Дэвтрээ зурагдаж илгээсэн", icon: Camera },
  COMEBACK: { label: "Эргэж ирсэн", icon: Sparkles },
};

function describe(reason: string) {
  if (reason.startsWith("SPEND:")) return { label: "Шагнал нээсэн", icon: Star };
  return REASONS[reason] ?? { label: reason, icon: Star };
}

function dayUb(d: Date): string {
  return new Intl.DateTimeFormat("mn-MN", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Ulaanbaatar",
  }).format(d);
}

export default async function MyPointsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect("/");
  if (!pointsEnabled()) redirect("/suragch");

  const [points, history, avatarId, catalog] = await Promise.all([
    myPoints(viewer),
    myHistory(viewer, 20),
    selectedAvatar(viewer.userId),
    avatarCatalog(viewer),
  ]);

  const next = catalog.find((c) => !c.owned);

  return (
    <AppShell viewer={viewer} eyebrow="Миний оноо" title={`${points} оноо`} subtitle="Хаанаас цуглав.">
      <Link href="/suragch" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <Card className="bg-role-student">
        <div className="flex items-center gap-4">
          <Avatar id={avatarId} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-extrabold text-navy">{points}</p>
            <p className="text-sm text-ink-soft">
              {next
                ? next.cost - points > 0
                  ? `${next.name} хүртэл ${next.cost - points} оноо`
                  : `${next.name}-г нээж болно!`
                : "Бүх шагналыг цуглуулсан 🎉"}
            </p>
          </div>
        </div>
      </Card>

      <section>
        <SectionLabel>Хэрхэн цуглуулах вэ</SectionLabel>
        <div className="space-y-2">
          {[
            { icon: NotebookPen, t: "Даалгавраа хийх", p: POINTS_HOMEWORK_DONE, tint: "ягаан" as const },
            { icon: Camera, t: "Дэвтрээ зурагдаж илгээх", p: POINTS_PHOTO, tint: "цэнхэр" as const },
            { icon: Sparkles, t: "Завсарласны дараа эргэж ирэх", p: POINTS_COMEBACK, tint: "ногоон" as const },
          ].map((r) => (
            <div
              key={r.t}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <IconBox icon={r.icon} tint={r.tint} />
              <span className="min-w-0 flex-1 font-bold text-ink">{r.t}</span>
              <span className="shrink-0 font-extrabold text-brand">+{r.p}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Сүүлийн хөдөлгөөн</SectionLabel>
        {history.length === 0 ? (
          <Empty icon={Star}>Одоогоор оноо алга. Даалгавраа хийвэл эхэлнэ.</Empty>
        ) : (
          <div className="space-y-2">
            {history.map((h, i) => {
              const d = describe(h.reason);
              const Icon = d.icon;
              return (
                <div
                  key={`${h.createdAt.getTime()}-${i}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.2} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{d.label}</span>
                    <span className="block text-xs text-ink-faint">{dayUb(h.createdAt)}</span>
                  </span>
                  <span
                    className={`shrink-0 font-extrabold ${
                      h.points > 0 ? "text-dot-parent" : "text-ink-faint"
                    }`}
                  >
                    {h.points > 0 ? `+${h.points}` : h.points}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Link
        href="/suragch/shagnal"
        className="block rounded-2xl bg-brand px-4 py-4 text-center text-lg font-extrabold text-brand-ink hover:bg-brand-strong"
      >
        Урамшуулал харах
      </Link>
    </AppShell>
  );
}
