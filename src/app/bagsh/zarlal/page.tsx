import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone, Users } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, IconBox, SectionLabel } from "@/components/ui";
import { myClasses } from "@/server/homework/service";
import { classAnnouncements } from "@/server/announce/service";
import { formatDueUb } from "@/server/homework/time";
import { deleteAnnouncementAction } from "./actions";
import { AnnounceForm } from "@/components/announce-form";

export const dynamic = "force-dynamic";

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: "Бүгдэд",
  PARENTS: "Эцэг эхэд",
  STUDENTS: "Сурагчдад",
};

/**
 * Зарлал бичих дэлгэц.
 *
 * ⛔ Хариу бичих боломж БАЙХГҮЙ. Багш бичнэ, бусад нь уншина.
 * Хариу нээвэл 24 эцэг эхийн яриа болж, багш уншиж амжихгүй болно
 * (`src/server/announce/service.ts`-ийн тайлбарыг үз).
 */
export default async function AnnouncePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const classList = await myClasses(viewer);

  if (classList.length === 0) {
    return (
      <AppShell
        viewer={viewer}
        eyebrow="Багшийн орон зай"
        title="Зарлал"
        subtitle="Зарлал бичихийн тулд анги хэрэгтэй."
      >
        <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
          ← Буцах
        </Link>
        <Empty icon={Users}>
          Танд хариуцсан анги алга байна. Эрхлэгчээсээ анги хуваарилуулсны дараа
          зарлал бичиж эхэлнэ.
        </Empty>
      </AppShell>
    );
  }

  const klass = classList[0];
  const items = await classAnnouncements(viewer, klass.id);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Багшийн орон зай"
      title="Зарлал"
      subtitle={`${klass.name} анги · эцэг эх, сурагчийн нүүрэнд гарна`}
    >
      <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <Card>
        <AnnounceForm classId={klass.id} className={`${klass.name} анги`} />
      </Card>

      <section>
        <SectionLabel>Илгээсэн зарлал</SectionLabel>
        {items.length === 0 ? (
          <Empty icon={Megaphone}>Одоогоор зарлал байхгүй.</Empty>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <IconBox icon={Megaphone} tint={a.className ? "цэнхэр" : "шар"} />
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-line text-ink">{a.body}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {a.className ?? "Сургууль даяар"} · {AUDIENCE_LABEL[a.audience]} ·{" "}
                      {formatDueUb(a.createdAt)}
                    </p>
                  </div>
                </div>

                {a.authorName && (
                  <form action={deleteAnnouncementAction} className="mt-2">
                    <input type="hidden" name="announcementId" value={a.id} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-ink-faint hover:text-accent"
                    >
                      Устгах
                    </button>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
