import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, UserCheck, UserPlus, Users } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, IconBox, SectionLabel } from "@/components/ui";
import { InviteButton } from "@/components/invite-button";
import { myClasses } from "@/server/homework/service";
import { classStudents, pendingGuardians } from "@/server/invite/service";
import { approveGuardianAction } from "./actions";

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
                  <div className="mt-3 flex gap-2">
                    <form action={approveGuardianAction} className="flex-1">
                      <input type="hidden" name="guardianId" value={p.id} />
                      <input type="hidden" name="decision" value="ACTIVE" />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-brand-strong"
                      >
                        Батлах
                      </button>
                    </form>
                    <form action={approveGuardianAction}>
                      <input type="hidden" name="guardianId" value={p.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <button
                        type="submit"
                        className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink-soft hover:border-accent hover:text-accent"
                      >
                        Татгалзах
                      </button>
                    </form>
                  </div>
                </Card>
              )),
            )}
          </div>
        </section>
      )}

      {data.length === 0 && <Empty icon={Users}>Танд хариуцсан анги алга байна.</Empty>}

      {data.map(({ klass, students }) => (
        <section key={klass.id}>
          <SectionLabel>
            {klass.name} анги · {students.length} сурагч
          </SectionLabel>

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
                  <InviteButton classId={klass.id} studentId={s.id} studentName={s.name} />
                </div>

                {s.loginCode && (
                  <p className="mt-2 flex items-center gap-2 rounded-xl bg-surface-soft px-3 py-2 text-xs text-ink-soft">
                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    Сурагчийн нэвтрэх код:{" "}
                    <span className="font-mono font-bold text-ink">{s.loginCode}</span>
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </AppShell>
  );
}
