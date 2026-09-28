import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  BadgeCheck,
  ClipboardCheck,
  Plus,
  Wallet,
  TriangleAlert,
  Megaphone,
  UserPlus,
  Users,
} from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Bar, Card, Empty, FeatureCard, Row, SectionLabel, StatTile } from "@/components/ui";
import { listClassHomework, myClasses, strugglingStudents } from "@/server/homework/service";
import { myIncentive } from "@/server/incentive/service";
import { startThreadAction } from "@/app/yaria/actions";
import { formatDueUb, isOverdue } from "@/server/homework/time";

export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const [classList, incentive] = await Promise.all([myClasses(viewer), myIncentive(viewer)]);
  const perClass = await Promise.all(
    classList.map(async (c) => ({
      klass: c,
      items: await listClassHomework(viewer, c.id),
      struggling: await strugglingStudents(viewer, c.id),
    })),
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
            {/* «Шалгах» гэвэл хийх ёстой ажил мэт. Энэ бол зүгээр нэг тоо. */}
            <StatTile value={waiting} label="Илгээсэн" tone="онцлох" />
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
        perClass.map(({ klass, items, struggling }) => (
          <section key={klass.id}>
            <SectionLabel>
              {klass.name} анги · {klass.grade}-р анги
            </SectionLabel>

            {/*
              Хэв шинж — нэг өдрийн зураг биш. «Өчигдөр хийгээгүй» нь мартсан
              байж болно; «сүүлийн 5-аас 1» бол өөр асуудал. Багш тоолох
              ажлыг хийхгүй, шууд ярих зам руу хөтөлнө (`DECISIONS.md` §16).
            */}
            {struggling.length > 0 && (
              <Card className="mb-2.5 border-warn-line bg-warn-bg">
                <p className="font-extrabold text-ink">Дэмжлэг хэрэгтэй байж магадгүй</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Сүүлийн даалгавруудаас цөөхнийг нь хийсэн хүүхдүүд.
                </p>
                <ul className="mt-3 space-y-2">
                  {struggling.map((st) => (
                    <li
                      key={st.studentUserId}
                      className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-ink">{st.name}</span>
                        <span className="block text-xs text-ink-faint">
                          {st.total} даалгавраас {st.done} нь хийгдсэн
                        </span>
                      </span>
                      <form action={startThreadAction}>
                        <input type="hidden" name="studentUserId" value={st.studentUserId} />
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-brand hover:border-brand"
                        >
                          Ярих
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

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
          <SectionLabel>Ангийн байдал</SectionLabel>
          {/*
            ⚠️ Өнгө аясыг болгоомжтой сонгов. Өмнө нь «Даалгавар шалгах —
            91 сурагчийн ажил ХҮЛЭЭГДЭЖ БАЙНА» гэж бичигдсэн байсан нь багшид
            биелүүлээгүй ҮҮРЭГ мэт харагдаж байв.

            Гэтэл багш дэвтрийг нь ангидаа аль хэдийн хардаг. Аппаар дахин
            шалгах нь нэг ажлыг хоёр удаа хийлгэнэ — Zulzaga 2026-09-28-нд
            үүнийг зөв зааж өгсөн. Шалгах нь СОНГОЛТ: багш хүсвэл тэмдэглэл
            бичнэ, хүсэхгүй бол огт хэрэггүй. Жагсаалт нь үлдэнэ, дарамт нь
            алга болно.
          */}
          <Row
            icon={ClipboardCheck}
            tint="цэнхэр"
            title="Сурагчдын илгээсэн ажил"
            subtitle={
              waiting > 0
                ? `${waiting} хүүхэд хийснээ тэмдэглэсэн — хүсвэл хараарай`
                : "Шинэ зүйл алга"
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

      {/*
        Пилотын хөлс (`docs/DECISIONS.md` §14). Эрхлэгч бүртгээгүй багшид
        огт гарахгүй — сургуулийн бүх багшид мөнгө амлахгүйн тулд.

        ⚠️ Энд хэрэглээний тоо БИЧИХГҮЙ. Хөлс нь саналын төлөө, даалгаврын
        тоотой холбовол багш нар тоо гүйцээж эхэлнэ.
      */}
      {incentive && (
        <FeatureCard
          icon={incentive.status === "PAID" ? BadgeCheck : Wallet}
          tint={incentive.status === "PAID" ? "ногоон" : "шар"}
          eyebrow={`${incentive.periodLabel} · пилотын хөлс`}
          title={`${incentive.amountMnt.toLocaleString("mn-MN")}₮`}
        >
          {incentive.status === "PAID" ? (
            <>
              Олгогдсон. Баярлалаа — таны санал энэ аппыг сайжруулж байна.
            </>
          ) : (
            <>
              Долоо хоног бүр 15 минут ярилцаж, юу ажиллахгүй байгааг хэлэхэд
              сарын эцэст эрхлэгчээр дамжуулан олгоно.
            </>
          )}
        </FeatureCard>
      )}
    </AppShell>
  );
}
