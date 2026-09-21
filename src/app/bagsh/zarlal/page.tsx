import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Megaphone, Users } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, IconBox, SectionLabel } from "@/components/ui";
import { myClasses } from "@/server/homework/service";
import { classAnnouncements } from "@/server/announce/service";
import { formatDueUb } from "@/server/homework/time";
import { deleteAnnouncementAction, postAnnouncementAction } from "./actions";

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
export default async function AnnouncePage({ searchParams }: PageProps<"/bagsh/zarlal">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const { ilgeesen } = await searchParams;
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

      {ilgeesen === "1" && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-line bg-role-parent px-4 py-3 text-sm font-bold text-ink"
        >
          <Check className="h-4 w-4 shrink-0 text-dot-parent" strokeWidth={3} />
          Илгээгдлээ. Утсанд нь мэдэгдэл очлоо.
        </p>
      )}

      <Card>
        <form action={postAnnouncementAction} className="space-y-3">
          <input type="hidden" name="classId" value={klass.id} />
          <input type="hidden" name="className" value={`${klass.name} анги`} />

          <textarea
            name="body"
            required
            rows={4}
            maxLength={2000}
            placeholder="Жишээ: Маргааш 10:00 цагт эцэг эхийн хурал болно."
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
          />

          <fieldset>
            <legend className="text-sm font-bold text-ink">Хэнд</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(["ALL", "PARENTS", "STUDENTS"] as const).map((a, i) => (
                <label
                  key={a}
                  className="flex cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-2 py-2.5 text-center text-sm font-bold text-ink has-[:checked]:border-brand has-[:checked]:bg-role-teacher has-[:checked]:text-brand"
                >
                  <input
                    type="radio"
                    name="audience"
                    value={a}
                    defaultChecked={i === 0}
                    className="sr-only"
                  />
                  {AUDIENCE_LABEL[a]}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand px-4 py-4 text-base font-extrabold text-brand-ink hover:bg-brand-strong"
          >
            Илгээх
          </button>

          <p className="text-center text-xs text-ink-faint">
            Зарлал нь нэг талын мэдээлэл — хариу бичих боломжгүй.
          </p>
        </form>
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
