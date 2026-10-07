import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Empty } from "@/components/ui";
import { Users } from "lucide-react";
import { myClasses, schoolSubjects } from "@/server/homework/service";
import { addDaysUb, todayUb } from "@/server/homework/time";
import { NewHomeworkForm } from "@/components/new-homework-form";

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

  // Анги байхгүй багшийг чимээгүй буцаахгүй — шалтгааныг нь хэлнэ.
  if (classList.length === 0) {
    return (
      <AppShell
        viewer={viewer}
        eyebrow="Багшийн орон зай"
        title="Даалгавар өгөх"
        subtitle="Даалгавар өгөхийн тулд анги хэрэгтэй."
      >
        <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
          ← Буцах
        </Link>
        <Empty icon={Users}>
          Танд хариуцсан анги алга байна. Эрхлэгчээсээ анги хуваарилуулсны дараа
          даалгавар өгч эхэлнэ.
        </Empty>
      </AppShell>
    );
  }

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

      <NewHomeworkForm
        classes={classList.map((c) => ({ id: c.id, name: c.name }))}
        subjects={subjectList.map((x) => ({ id: x.id, name: x.name }))}
        tomorrow={tomorrow}
        today={todayUb()}
      />
    </AppShell>
  );
}
