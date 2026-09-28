import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock, Star } from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/avatars";
import { avatarCatalog } from "@/server/points/avatars";
import { myPoints, pointsEnabled } from "@/server/points/service";
import { buyAvatarAction, selectAvatarAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Шагнал — оноогоор нээгддэг аватарууд (`docs/DECISIONS.md` §18).
 *
 * ⚠️ Ангийн тэргүүлэгчдийн жагсаалт ЗОРИУД байхгүй. «Хэн хамгийн их
 * оноотой вэ» гэсэн самбар нь хоцорч байгаа хүүхдийг эхний өдөр бүр
 * холдуулна. Хүүхэд өөрийн оноог хардаг, бусадтай харьцуулдаггүй.
 */
export default async function RewardsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "STUDENT") redirect("/");
  // Туг унтраалттай бол энэ хуудас байхгүйтэй адил.
  if (!pointsEnabled()) redirect("/suragch");

  const [items, points] = await Promise.all([avatarCatalog(viewer), myPoints(viewer)]);
  const next = items.find((i) => !i.owned);

  return (
    <AppShell
      viewer={viewer}
      eyebrow="Шагнал"
      title={`${points} оноо`}
      subtitle="Даалгавраа хийх бүрд цуглана."
    >
      <Link href="/suragch" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      {next && (
        <Card className="bg-role-student">
          <div className="flex items-center gap-3">
            <Avatar id={next.id} size={44} locked />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-navy">
                {next.cost - points > 0
                  ? `${next.cost - points} оноо дутуу`
                  : `${next.name}-г одоо нээж болно!`}
              </p>
              <p className="text-xs text-ink-soft">Дараагийн шагнал: {next.name}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((a) => (
          <Card key={a.id} className={a.selected ? "border-brand" : undefined}>
            <div className="flex flex-col items-center text-center">
              <Avatar id={a.id} size={72} locked={!a.owned} />
              <p className="mt-2 font-extrabold text-ink">{a.name}</p>

              {a.owned ? (
                a.selected ? (
                  <p className="mt-2 rounded-full bg-role-parent px-3 py-1 text-xs font-bold text-ink">
                    Сонгосон ✓
                  </p>
                ) : (
                  <form action={selectAvatarAction} className="mt-2 w-full">
                    <input type="hidden" name="avatarId" value={a.id} />
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-line px-3 py-2 text-xs font-bold text-brand hover:border-brand"
                    >
                      Сонгох
                    </button>
                  </form>
                )
              ) : (
                <>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-ink-faint">
                    <Star className="h-3.5 w-3.5" strokeWidth={2.6} />
                    {a.cost} оноо
                  </p>
                  {a.affordable ? (
                    <form action={buyAvatarAction} className="mt-2 w-full">
                      <input type="hidden" name="avatarId" value={a.id} />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-brand-ink hover:bg-brand-strong"
                      >
                        Нээх
                      </button>
                    </form>
                  ) : (
                    <p className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-surface-soft px-3 py-2 text-xs font-bold text-ink-faint">
                      <Lock className="h-3.5 w-3.5" strokeWidth={2.6} />
                      Дутуу
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <p className="text-center text-xs text-ink-faint">
        Даалгавраа хийхэд 10 оноо, дэвтрийнхээ зургийг илгээвэл нэмэлт 5 оноо.
      </p>
    </AppShell>
  );
}
