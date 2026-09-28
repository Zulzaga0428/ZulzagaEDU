import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { homeworkForEdit, schoolSubjects } from "@/server/homework/service";
import { updateHomeworkAction } from "../../../actions";

export const dynamic = "force-dynamic";

/**
 * Даалгавар засах.
 *
 * Анги, сурагчийн жагсаалт энд ӨӨРЧЛӨГДӨХГҮЙ — зөвхөн бичсэн зүйл.
 * Сурагчдын «хийсэн» тэмдэг, дэвтрийн зураг бүгд хэвээр үлдэнэ.
 *
 * Самбарын зургийг энд солихгүй: буруу зураг тавьсан бол даалгавраа
 * устгаад шинээр өгөх нь ойлгомжтой. Засварын дэлгэц бүх зүйлийг хийх
 * гэж оролдвол ойлгоход хүнд болно.
 */

/** `YYYY-MM-DD` — УБ-гийн цагаар. `<input type="date">`-д яг ийм хэрэгтэй. */
function dueDateUb(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(d);
}

export default async function EditHomeworkPage({
  params,
}: PageProps<"/bagsh/daalgavar/[id]/zasah">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const { id } = await params;
  const [hw, subjectList] = await Promise.all([
    homeworkForEdit(viewer, id),
    schoolSubjects(viewer),
  ]);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Даалгавар"
      title="Засах"
      subtitle="Сурагчдын хийсэн тэмдэг, зураг хэвээр үлдэнэ."
    >
      <Link
        href={`/bagsh/daalgavar/${id}`}
        className="text-sm font-bold text-brand hover:underline"
      >
        ← Буцах
      </Link>

      <form action={updateHomeworkAction} className="space-y-5">
        <input type="hidden" name="homeworkId" value={id} />

        <label className="block">
          <span className="text-sm font-bold text-ink">Хичээл</span>
          <select
            name="subjectId"
            defaultValue={hw.subjectId ?? ""}
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
            defaultValue={hw.title}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
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
            defaultValue={hw.description ?? ""}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">Хэзээ хүртэл</span>
          <input
            type="date"
            name="dueDate"
            required
            defaultValue={dueDateUb(hw.dueAt)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            Хугацааг урагшлуулж болно — өнгөрсөн өдөр ч тавьж болно.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-4 py-5 text-lg font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Хадгалах
        </button>
      </form>

      <Card className="bg-surface-soft">
        <p className="text-xs text-ink-soft">
          Сурагч, эцэг эхэд шинэ мэдэгдэл явуулахгүй. Том өөрчлөлт бол зарлал
          бичих нь тодорхой.
        </p>
      </Card>
    </AppShell>
  );
}
