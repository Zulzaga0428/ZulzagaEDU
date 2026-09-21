import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { myClasses, schoolSubjects } from "@/server/homework/service";
import { addDaysUb, todayUb } from "@/server/homework/time";
import { createHomeworkAction } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Даалгавар өгөх дэлгэц.
 *
 * Зорилтот хэмжүүр: **30 секундээс богино** (`docs/ROADMAP.md` 4 дэх долоо
 * хоног). Тиймээс талбарууд цөөхөн, эцсийн хугацаа маргаашаар урьдчилан
 * бөглөгдсөн, анги нэг бол сонголт огт гарахгүй.
 */
export default async function NewHomeworkPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const [classList, subjectList] = await Promise.all([
    myClasses(viewer),
    schoolSubjects(viewer),
  ]);

  if (classList.length === 0) redirect("/bagsh");

  const tomorrow = addDaysUb(todayUb(), 1);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Багшийн орон зай"
      title="Даалгавар өгөх"
      subtitle="Илгээмэгц ангийн бүх сурагч, эцэг эхэд харагдана."
    >
      <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <form action={createHomeworkAction} className="space-y-5">
        {classList.length === 1 ? (
          <input type="hidden" name="classId" value={classList[0].id} />
        ) : (
          <label className="block">
            <span className="text-sm font-bold text-ink">Анги</span>
            <select
              name="classId"
              required
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
            >
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} анги
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-sm font-bold text-ink">Хичээл</span>
          <select
            name="subjectId"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
          >
            <option value="">— сонгох —</option>
            {subjectList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">Юу хийх вэ</span>
          <input
            name="title"
            required
            maxLength={200}
            autoFocus
            placeholder="Жишээ: 42–48-р дасгал"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">
            Тайлбар <span className="font-normal text-ink-faint">— заавал биш</span>
          </span>
          <textarea
            name="description"
            rows={3}
            maxLength={2000}
            placeholder="Нэмэлт заавар байвал энд бич."
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">Хэзээ хүртэл</span>
          <input
            type="date"
            name="dueDate"
            required
            defaultValue={tomorrow}
            min={todayUb()}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            Тухайн өдрийн 23:59 цаг хүртэл.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-4 py-5 text-lg font-extrabold text-brand-ink shadow-[0_10px_24px_rgba(43,133,246,0.28)] hover:bg-brand-strong"
        >
          Илгээх
        </button>

        <p className="text-center text-xs text-ink-faint">
          Илгээмэгц ангийн бүх сурагч, эцэг эхэд харагдана.
        </p>
      </form>
    </AppShell>
  );
}
