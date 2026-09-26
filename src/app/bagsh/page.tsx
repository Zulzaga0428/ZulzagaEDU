import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Plus,
  TriangleAlert,
  Megaphone,
  UserPlus,
  Users,
} from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Bar, Card, Empty, FeatureCard, Row, SectionLabel, StatTile } from "@/components/ui";
import { listClassHomework, myClasses } from "@/server/homework/service";
import { formatDueUb, isOverdue } from "@/server/homework/time";

export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const classList = await myClasses(viewer);
  const perClass = await Promise.all(
    classList.map(async (c) => ({ klass: c, items: await listClassHomework(viewer, c.id) })),
  );

  const all = perClass.flatMap((p) => p.items);
  const needsAttention = all.filter((h) => isOverdue(h.dueAt) && h.done < h.total);

  // Хийсэн ч багш хараагүй ажлын тоо. Өмнө нь «хэсэгчлэн хийгдсэн даалгаврын
  // тоо»-г харуулж байсан нь шалгах ажилтай огт хамаагүй тоо байв.
  const waiting = all.reduce((n, h) => n + h.toCheck, 0);
  const nextToCheck = all.find((h) => h.toCheck > 0);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Багшийн орон зай"
      title="Сайн байна уу, багш аа"
      subtitle="Хүүхэд бүрийн жижиг ахицыг хамтдаа анзаарая."
    >
      {classList.length > 0 && (
        <>
          {/* Багшийн өдөр бүр хийдэг ганц үйлдэл — хамгийн дээд, хамгийн том. */}
          <Link
            href="/bagsh/daalgavar/shine"
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-brand px-4 py-5 text-lg font-extrabold text-brand-ink shadow-[0_10px_24px_rgba(43,133,246,0.28)] hover:bg-brand-strong"
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
            Даалгавар өгөх
          </Link>

          <div className="grid grid-cols-3 gap-2.5">
            <StatTile value={classList.reduce((n, c) => n + c.students, 0)} label="Сурагч" />
            <StatTile value={all.length} label="Даалгавар" />
            <StatTile value={waiting} label="Шалгах" tone="онцлох" />
          </div>
        </>
      )}

      {needsAttention.length > 0 && (
        <section>
          <SectionLabel>Анхаарах зүйл</SectionLabel>
          <div className="space-y-2">
            {needsAttention.map((h) => (
              <Row
                key={h.id}
                icon={TriangleAlert}
                tint="шар"
                title={h.title}
                subtitle={`${h.total - h.done} сурагч хийгээгүй байна`}
                trailing={<span className="text-ink-faint">›</span>}
                href={`/bagsh/daalgavar/${h.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {perClass.length === 0 ? (
        /*
          Анги байхгүй багш аппыг нээгээд юу ч хийж чадахгүй. Хоосон дэлгэц
          үзүүлэхийн оронд ЯАГААД гэдгийг, мөн хэнд хандахыг хэлнэ.
        */
        <Empty icon={Users}>
          Танд хариуцсан анги алга байна. Хичээлийн эрхлэгч тань ангид
          хуваарилсны дараа даалгавар өгөх, хуваарь оруулах боломжтой болно.
        </Empty>
      ) : (
        perClass.map(({ klass, items }) => (
          <section key={klass.id}>
            <SectionLabel>
              {klass.name} анги · {klass.grade}-р анги
            </SectionLabel>

            {items.length === 0 ? (
              <Empty icon={BookOpen}>Одоогоор даалгавар өгөөгүй байна.</Empty>
            ) : (
              <div className="space-y-2.5">
                {items.map((h) => {
                  const pct = h.total === 0 ? 0 : Math.round((h.done / h.total) * 100);
                  const late = isOverdue(h.dueAt) && h.done < h.total;
                  return (
                    <Link key={h.id} href={`/bagsh/daalgavar/${h.id}`} className="block">
                      <Card className="transition-colors hover:border-brand">
                        <div className="flex items-start gap-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-extrabold text-ink">
                              {h.title}
                            </span>
                            <span className="block text-xs text-ink-faint">
                              {h.subject ?? "Хичээл заагаагүй"} · {formatDueUb(h.dueAt)}
                              {late && <span className="text-accent"> · хугацаа өнгөрсөн</span>}
                            </span>
                          </span>
                          <span className="shrink-0 text-lg font-extrabold text-brand">
                            {h.done}/{h.total}
                          </span>
                        </div>
                        <div className="mt-3">
                          <Bar percent={pct} label={`${h.total} сурагчийн ${h.done} нь хийсэн`} />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))
      )}

      <section>
        <SectionLabel>Анги</SectionLabel>
        <Row
          icon={UserPlus}
          tint="ногоон"
          title="Сурагч ба эцэг эх"
          subtitle="QR гаргах, хүсэлт батлах"
          trailing={<span className="text-ink-faint">›</span>}
          href="/bagsh/urilga"
        />
        <div className="mt-2">
          <Row
            icon={CalendarDays}
            tint="ягаан"
            title="Хичээлийн хуваарь"
            subtitle="Улиралд нэг удаа бөглөнө"
            trailing={<span className="text-ink-faint">›</span>}
            href="/bagsh/hovaari"
          />
        </div>
        <div className="mt-2">
          <Row
            icon={Megaphone}
            tint="шар"
            title="Зарлал"
            subtitle="Ангидаа мэдээлэл өгөх"
            trailing={<span className="text-ink-faint">›</span>}
            href="/bagsh/zarlal"
          />
        </div>
      </section>

      {all.length > 0 && (
        <section>
          <SectionLabel>Өнөөдрийн ажил</SectionLabel>
          {/*
            Товш болохгүй мөр байв — багш дарж үзээд юу ч болохгүй. Шалгах юм
            байвал хамгийн ойрын даалгавар руу аваачна, байхгүй бол товшихгүй.
          */}
          <Row
            icon={ClipboardCheck}
            tint="цэнхэр"
            title="Даалгавар шалгах"
            subtitle={
              waiting > 0
                ? `${waiting} сурагчийн ажил хүлээгдэж байна`
                : "Хүлээгдэж байгаа зүйл алга"
            }
            href={nextToCheck ? `/bagsh/daalgavar/${nextToCheck.id}` : undefined}
            trailing={
              <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-sm font-bold text-brand">
                {waiting}
              </span>
            }
          />
        </section>
      )}

      {classList.length > 0 && (
        <FeatureCard icon={Users} tint="ногоон" eyebrow="Энэ долоо хоногт" title="Ангидаа тавтай морил">
          {classList.map((c) => c.name).join(", ")} ангийн сурагчид таны даалгаврыг хүлээж байна.
        </FeatureCard>
      )}
    </AppShell>
  );
}
