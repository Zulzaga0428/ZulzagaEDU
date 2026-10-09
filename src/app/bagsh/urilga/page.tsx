import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, MessageSquare, UserCheck, UserPlus, Users } from "lucide-react";
import { getViewer, isParentContact } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, IconBox, SectionLabel } from "@/components/ui";
import { InviteButton } from "@/components/invite-button";
import { AddStudent, ResetPin } from "@/components/student-credentials";
import { myClasses } from "@/server/homework/service";
import { classStudents, pendingGuardians } from "@/server/invite/service";
import { startThreadAction } from "@/app/yaria/actions";
import { GuardianDecision } from "@/components/guardian-decision";

export const dynamic = "force-dynamic";

const RELATION: Record<string, string> = {
  MOTHER: "ээж",
  FATHER: "аав",
  GUARDIAN: "асран хамгаалагч",
};

export default async function InvitePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "TEACHER") redirect("/");

  const classList = await myClasses(viewer);
  const data = await Promise.all(
    classList.map(async (c) => ({
      klass: c,
      students: await classStudents(viewer, c.id),
      pending: await pendingGuardians(viewer, c.id),
      /*
        Эцэг эхтэй холбоотой товчнууд (QR урилга, «ярих») — зөвхөн анги удирдсан
        багшид (`isParentContact`). Хичээлийн багш сурагчдаа харсаар байна.
      */
      parentContact: await isParentContact(viewer.userId, c.id, viewer.schoolId),
    })),
  );

  const totalPending = data.reduce((n, d) => n + d.pending.length, 0);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Багшийн орон зай"
      title="Сурагч ба эцэг эх"
      subtitle="QR гаргаж эцэг эхийг ангид нэгтгэнэ."
    >
      <Link href="/bagsh" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      {totalPending > 0 && (
        <section>
          <SectionLabel>Батлахыг хүлээж байна · {totalPending}</SectionLabel>
          <div className="space-y-2">
            {data.flatMap((d) =>
              d.pending.map((p) => (
                <Card key={p.id} className="border-warn-line bg-warn-bg">
                  <div className="flex items-start gap-3">
                    <IconBox icon={UserCheck} tint="шар" />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-ink">{p.parentName}</p>
                      <p className="text-xs text-ink-soft">
                        {p.studentName} — {RELATION[p.relation] ?? p.relation}
                        {p.parentPhone ? ` · ${p.parentPhone}` : ""}
                      </p>
                    </div>
                  </div>

                  {/*
                    ⚠️ Энэ бол хүүхдийн өгөгдлийн гол хаалга. Батлах хүртэл
                    эцэг эх юу ч харахгүй. Танихгүй хүн бол ТАТГАЛЗ.
                  */}
                  <GuardianDecision guardianId={p.id} />
                </Card>
              )),
            )}
          </div>
        </section>
      )}

      {data.length === 0 && <Empty icon={Users}>Танд хариуцсан анги алга байна.</Empty>}

      {data.map(({ klass, students, parentContact }) => (
        <section key={klass.id}>
          <SectionLabel>
            {klass.name} анги · {students.length} сурагч
          </SectionLabel>

          {!parentContact && (
            // QR, «ярих» яагаад алга болсныг хичээлийн багш ойлгох ёстой.
            <p className="mb-3 rounded-2xl border border-line bg-surface-soft px-4 py-3 text-sm text-ink-soft">
              Энэ ангийн эцэг эхтэй <b>анги удирдсан багш</b> харилцана. Та даалгавраа
              өгч, шалгасаар байна.
            </p>
          )}

          <div className="mb-3">
            <AddStudent classId={klass.id} className={klass.name} />
          </div>

          <div className="space-y-2">
            {students.map((s) => (
              <Card key={s.id}>
                <div className="flex items-center gap-3">
                  <IconBox icon={s.guardianCount > 0 ? UserCheck : UserPlus} tint={s.guardianCount > 0 ? "ногоон" : "саарал"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{s.name}</p>
                    <p className="text-xs text-ink-faint">
                      {s.guardianCount > 0
                        ? `${s.guardianCount} эцэг эх холбогдсон`
                        : "Эцэг эх холбогдоогүй"}
                      {s.pendingCount > 0 && (
                        <span className="text-accent"> · {s.pendingCount} хүлээгдэж буй</span>
                      )}
                    </p>
                  </div>
                  {parentContact && (
                    <InviteButton classId={klass.id} studentId={s.id} studentName={s.name} />
                  )}
                </div>

                {/*
                  Эцэг эх холбогдсон байж л яриа утгатай. Холбогдоогүй бол
                  хэнд ч очихгүй тул товч гаргахгүй (`DECISIONS.md` §17).
                */}
                {parentContact && s.guardianCount > 0 && (
                  <form action={startThreadAction} className="mt-2">
                    <input type="hidden" name="studentUserId" value={s.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-bold text-brand hover:border-brand"
                    >
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Эцэг эхтэй нь ярих
                    </button>
                  </form>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <p className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-soft px-3 py-2 text-xs text-ink-soft">
                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      Код:{" "}
                      <span className="font-mono font-bold text-ink">
                        {s.loginCode ?? "олгоогүй"}
                      </span>
                    </span>
                  </p>
                  {/* PIN мартах нь 8 настай хүүхдэд ЗААВАЛ болно. */}
                  <ResetPin studentId={s.id} studentName={s.name} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </AppShell>
  );
}
