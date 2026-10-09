import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, School, TriangleAlert, Wallet } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Empty, IconBox, SectionLabel } from "@/components/ui";
import { AddTeacher, ResetTeacherPin } from "@/components/teacher-admin";
import { HomeroomPicker } from "@/components/homeroom-picker";
import { listClasses, listTeachers } from "@/server/school/manage";
import {
  assignTeacherAction,
  cancelIncentiveAction,
  createClassAction,
  enrollIncentiveAction,
  markIncentivePaidAction,
  unassignTeacherAction,
} from "./actions";
import {
  PILOT_AMOUNT_MNT,
  currentPeriod,
  periodLabel,
  schoolIncentives,
} from "@/server/incentive/service";

export const dynamic = "force-dynamic";

/**
 * Эрхлэгчийн удирдлага — багш, анги.
 *
 * Энэ хуудас байхгүй байхад шинэ багш системд орсон ч юу ч хийж чаддаггүй
 * байв: гишүүнчлэлтэй атлаа ангигүй тул даалгавар ч, хуваарь ч оруулж
 * чадахгүй. **Багшийг ангид хуваарилах нь багш ажиллаж эхлэх түлхүүр.**
 */
export default async function ManageTeachersPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "ACADEMIC_MANAGER") redirect("/");

  const [teachers, classList, incentives] = await Promise.all([
    listTeachers(viewer),
    listClasses(viewer),
    schoolIncentives(viewer),
  ]);
  const unassigned = teachers.filter((t) => t.classNames === "");
  const label = periodLabel(currentPeriod());

  // Багш бүрийн энэ сарын мөр — байхгүй бол бүртгэх товч гарна.
  const byTeacher = new Map(incentives.map((i) => [i.teacherUserId, i]));
  const enrolled = incentives.filter((i) => i.status !== "CANCELLED");
  const totalMnt = enrolled.reduce((n, i) => n + i.amountMnt, 0);
  const paidMnt = enrolled
    .filter((i) => i.status === "PAID")
    .reduce((n, i) => n + i.amountMnt, 0);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Эрхлэгчийн орон зай"
      title="Багш ба анги"
      subtitle="Багш ангид хуваарилагдсаны дараа ажиллаж эхэлнэ."
      wide
    >
      <Link href="/erhlegch" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      {unassigned.length > 0 && (
        <Card className="border-warn-line bg-warn-bg">
          <div className="flex items-start gap-3">
            <IconBox icon={TriangleAlert} tint="шар" />
            <div>
              <p className="font-extrabold text-ink">
                {unassigned.length} багш ангигүй байна
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">
                {unassigned.map((t) => t.name).join(", ")} — ангид хуваарилах хүртэл
                даалгавар өгөх боломжгүй.
              </p>
            </div>
          </div>
        </Card>
      )}

      <section>
        <SectionLabel>Багш нэмэх</SectionLabel>
        <Card>
          <AddTeacher />
          <p className="mt-2 text-xs text-ink-faint">
            Дугаар нь багшийн нэвтрэх нэр болно. PIN нэг л удаа харагдана.
          </p>
        </Card>
      </section>

      {enrolled.length > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <IconBox icon={Wallet} tint="шар" />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-ink">
                {label} · {totalMnt.toLocaleString("mn-MN")}₮
              </p>
              <p className="text-xs text-ink-faint">
                {enrolled.length} багш бүртгэгдсэн · {paidMnt.toLocaleString("mn-MN")}₮
                олгосон · {(totalMnt - paidMnt).toLocaleString("mn-MN")}₮ үлдсэн
              </p>
            </div>
          </div>
        </Card>
      )}

      <section>
        <SectionLabel>Багш нар · {teachers.length}</SectionLabel>
        {teachers.length === 0 ? (
          <Empty icon={GraduationCap}>Багш нэмээгүй байна.</Empty>
        ) : (
          <div className="space-y-2">
            {teachers.map((t) => (
              <Card key={t.id}>
                <div className="flex items-center gap-3">
                  <IconBox
                    icon={GraduationCap}
                    tint={t.classNames ? "ногоон" : "саарал"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{t.name}</p>
                    <p className="text-xs text-ink-faint">
                      {t.phone ?? "дугааргүй"} ·{" "}
                      {t.classNames || <span className="text-accent">ангигүй</span>}
                      {!t.hasPin && <span className="text-accent"> · PIN олгоогүй</span>}
                    </p>
                  </div>
                  <ResetTeacherPin teacherId={t.id} name={t.name} />
                </div>

                {/*
                  Пилотын хөлс (`docs/DECISIONS.md` §14). Хэн оролцохыг
                  эрхлэгч шийднэ — тиймээс бүртгэх товч энд, багшийн талд биш.
                */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  {(() => {
                    const inc = byTeacher.get(t.id);
                    if (!inc || inc.status === "CANCELLED") {
                      return (
                        <form action={enrollIncentiveAction} className="flex items-center gap-2">
                          <input type="hidden" name="teacherUserId" value={t.id} />
                          <span className="text-xs text-ink-faint">{label} хөлс:</span>
                          <input
                            name="amountMnt"
                            type="number"
                            /*
                              ⚠️ `step` бүү нэм. `min={1} step={1000}` үед
                              зөвшөөрөгдөх утга 1, 1001, 2001… болж 50,000 нь
                              ХҮЧИНГҮЙ болно — хөтөч формыг илгээхгүй.
                            */
                            min={1000}
                            defaultValue={PILOT_AMOUNT_MNT}
                            className="w-28 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-brand hover:border-brand"
                          >
                            Бүртгэх
                          </button>
                        </form>
                      );
                    }
                    return (
                      <>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            inc.status === "PAID"
                              ? "bg-role-parent text-ink"
                              : "bg-warn-bg text-accent"
                          }`}
                        >
                          {label} · {inc.amountMnt.toLocaleString("mn-MN")}₮ ·{" "}
                          {inc.status === "PAID" ? "олгосон" : "хүлээгдэж байна"}
                        </span>
                        {inc.status === "PENDING" && (
                          <form action={markIncentivePaidAction}>
                            <input type="hidden" name="incentiveId" value={inc.id} />
                            <button
                              type="submit"
                              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-brand-strong"
                            >
                              Олголоо
                            </button>
                          </form>
                        )}
                        <form action={cancelIncentiveAction}>
                          <input type="hidden" name="incentiveId" value={inc.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink-faint hover:border-accent hover:text-accent"
                          >
                            Цуцлах
                          </button>
                        </form>
                      </>
                    );
                  })()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Анги үүсгэх</SectionLabel>
        <Card>
          <form action={createClassAction} className="flex gap-2">
            <input
              name="name"
              required
              maxLength={20}
              placeholder="3А"
              className="w-24 shrink-0 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint"
            />
            <select
              name="grade"
              required
              defaultValue="3"
              className="w-28 shrink-0 rounded-xl border border-line bg-surface px-3 py-3 text-sm text-ink"
            >
              {/*
                1–12 бүх анги (Zulzaga, 2026-10-09): захирал хагас сургуульд систем
                авахгүй. Сервер (`school/manage.ts`) аль хэдийн 1–12-ыг зөвшөөрдөг
                байсан — зөвхөн энэ сонголт 5-аар зогсдог байв.
              */}
              {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  {g}-р анги
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-ink hover:bg-brand-strong"
            >
              Үүсгэх
            </button>
          </form>
        </Card>
      </section>

      <section>
        <SectionLabel>Ангиуд · {classList.length}</SectionLabel>
        {classList.length === 0 ? (
          <Empty icon={School}>Анги үүсгээгүй байна.</Empty>
        ) : (
          <div className="space-y-2">
            {classList.map((c) => (
              <Card key={c.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-extrabold text-ink">
                    {c.name} анги{" "}
                    <span className="text-sm font-normal text-ink-faint">
                      {c.grade}-р · {c.students} сурагч
                    </span>
                  </p>
                </div>

                <p className="mt-1 text-sm text-ink-soft">
                  Багш: {c.teacherNames || <span className="text-accent">хуваарилаагүй</span>}
                </p>

                {c.teacherNames && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {teachers
                      .filter((t) => c.teacherNames.split(", ").includes(t.name))
                      .map((t) => (
                        <form action={unassignTeacherAction} key={t.id}>
                          <input type="hidden" name="classId" value={c.id} />
                          <input type="hidden" name="teacherUserId" value={t.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-line px-3 py-1 text-xs font-bold text-ink-soft hover:border-accent hover:text-accent"
                          >
                            {t.name} — хасах
                          </button>
                        </form>
                      ))}
                  </div>
                )}

                {c.teachers.length > 0 && (
                  <HomeroomPicker
                    classId={c.id}
                    teachers={c.teachers}
                    current={c.homeroomTeacherId}
                  />
                )}

                <form action={assignTeacherAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="classId" value={c.id} />
                  <select
                    name="teacherUserId"
                    required
                    defaultValue=""
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"
                  >
                    <option value="" disabled>
                      — багш сонгох —
                    </option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-brand-strong"
                  >
                    Хуваарилах
                  </button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
