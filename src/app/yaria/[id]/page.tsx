import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { openThread } from "@/server/thread/service";
import { sendMessageAction } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Нэг яриа.
 *
 * Зориуд БАЙХГҮЙ зүйлс (`docs/DECISIONS.md` §17): уншсан тэмдэг, «бичиж
 * байна…», онлайн төлөв. Эдгээр нь «яагаад хараад хариулахгүй байна вэ»
 * гэсэн дарамтыг багш дээр үүсгэдэг.
 *
 * Мессежийг цагаар нь бүлэглэхгүй, энгийн урсгалаар харуулна — 25 гэр
 * бүлийн бага урсгалд хангалттай.
 */

function timeUb(d: Date): string {
  return new Intl.DateTimeFormat("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(d);
}

function dayUb(d: Date): string {
  return new Intl.DateTimeFormat("mn-MN", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Ulaanbaatar",
  }).format(d);
}

export default async function ThreadPage({ params }: PageProps<"/yaria/[id]">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const { id } = await params;
  const thread = await openThread(viewer, id);

  // Өдрийн тусгаарлагчийг УРЬДЧИЛАН бодно — render дотор хувьсагч өөрчлөхгүй.
  const items = thread.messages.map((m, i) => {
    const day = dayUb(m.createdAt);
    const prev = i === 0 ? null : dayUb(thread.messages[i - 1].createdAt);
    return { m, day, showDay: day !== prev };
  });

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Яриа"
      title={thread.studentName}
      subtitle={`${thread.className} анги`}
    >
      <Link href="/yaria" className="text-sm font-bold text-brand hover:underline">
        ← Бүх яриа
      </Link>

      <div className="space-y-3">
        {items.map(({ m, day, showDay }) => {
          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-3 text-center text-xs font-bold text-ink-faint">{day}</p>
              )}
              <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  {!m.mine && (
                    <p className="mb-0.5 px-1 text-xs font-bold text-ink-faint">
                      {m.authorName}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      m.mine
                        ? "bg-brand text-brand-ink"
                        : "border border-line bg-surface text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed">{m.body}</p>
                  </div>
                  <p
                    className={`mt-0.5 px-1 text-[11px] text-ink-faint ${
                      m.mine ? "text-right" : ""
                    }`}
                  >
                    {timeUb(m.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form action={sendMessageAction} className="flex items-end gap-2">
        <input type="hidden" name="threadId" value={thread.id} />
        <textarea
          name="body"
          required
          rows={2}
          maxLength={2000}
          placeholder="Мессеж бичих…"
          className="min-w-0 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-brand px-5 py-3.5 font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Илгээх
        </button>
      </form>

      <p className="text-center text-xs text-ink-faint">
        {viewer.role === "TEACHER"
          ? "Та ажлын цагаараа хариулна. Шуурхай хариулах үүрэг байхгүй."
          : "Багш ажлын цагаараа хариулна. Яаралтай бол сургууль руугаа залгаарай."}
      </p>
    </AppShell>
  );
}
