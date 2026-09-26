import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  LogOut,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getViewer } from "@/server/auth/access";
import { AppShell } from "@/components/app-shell";
import { Card, Row, SectionLabel } from "@/components/ui";
import { ROLE_LABEL } from "@/server/auth/roles";
import { myProfile } from "@/server/profile/service";
import { signOut } from "@/app/login/actions";
import { switchRole } from "@/app/actions";
import { changePinAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Профайл — дүр бүрд нэг хуудас.
 *
 * Энэ хуудас бол цаашдын зангилаа (`docs/BACKLOG.md`): оноо, шагнал, хэлний
 * ахиц бүгд энд холбогдоно. Тиймээс бүтэц нь «хэсэг нэмэхэд амархан» байхаар
 * хэсэгчилсэн.
 *
 * Мөн сурагч, эцэг эхийн **2 дахь дэлгэц** болж байгаа нь чухал — өмнө нь
 * тэдэнд ганц дэлгэц байсан тул доод nav хийх утгагүй байв.
 */

const PIN_ERRORS: Record<string, string> = {
  ОДООГИЙН_БУРУУ: "Одоогийн PIN буруу байна.",
  ХЭТ_АМАРХАН: "Энэ PIN хэт амархан таамаглагдана. Өөрийг сонгоно уу.",
  ИЖИЛ: "Шинэ PIN хуучинтайгаа ижил байна.",
  ФОРМАТ: "PIN яг 4 оронтой тоо байх ёстой.",
};

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const profile = await myProfile(viewer);
  const { pin, aldaa } = await searchParams;

  const saved = pin === "solison";
  const error = typeof aldaa === "string" ? PIN_ERRORS[aldaa] : undefined;

  // Сургуулийн нэрийг `AppShell` өөрөө толгой дээрээ бичдэг тул энд давтахгүй —
  // өмнө нь нэг дэлгэцэн дээр гурван удаа гарч байв.
  return (
    <AppShell
      viewer={viewer}
      eyebrow="Миний хуудас"
      title={profile.name}
      subtitle={ROLE_LABEL[profile.role]}
    >
      {(profile.classes.length > 0 || profile.children.length > 0) && (
        <section>
          <SectionLabel>{profile.role === "PARENT" ? "Миний хүүхэд" : "Миний анги"}</SectionLabel>

          {profile.classes.length > 0 && (
            <Row
              icon={profile.role === "TEACHER" ? GraduationCap : BookOpen}
              tint="ягаан"
              title={profile.classes.map((c) => `${c.name} анги`).join(", ")}
              subtitle={profile.role === "TEACHER" ? "Хариуцсан анги" : "Сурдаг анги"}
            />
          )}

          {profile.children.length > 0 && (
            <div className="space-y-2">
              {profile.children.map((c) => (
                <Row
                  key={c.id}
                  icon={Users}
                  tint="ногоон"
                  title={c.name}
                  subtitle={c.className ? `${c.className} анги` : "Анги тодорхойгүй"}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionLabel>Нэвтрэх</SectionLabel>

        {/*
          Сурагчид код, насанд хүрэгчид дугаар. Хүүхэд PIN-ээ мартвал багшид
          хэлэх кодоо энд хардаг — багш «кодоо хэл» гэж асуудаг.
        */}
        {profile.loginCode && (
          <Row
            icon={KeyRound}
            tint="шар"
            title={profile.loginCode}
            subtitle="Миний нэвтрэх код"
          />
        )}
        {profile.phone && (
          <Row icon={Phone} tint="саарал" title={profile.phone} subtitle="Нэвтрэх дугаар" />
        )}

        <Card className="mt-2">
          <h2 className="font-extrabold text-ink">PIN солих</h2>
          <p className="mt-0.5 text-xs text-ink-faint">
            Хэн нэгэн PIN-ийг тань мэдчихсэн бол шинээр сонгоорой.
          </p>

          {saved && (
            <p
              role="status"
              className="mt-3 rounded-xl border border-line bg-role-parent px-3 py-2 text-sm font-bold text-ink"
            >
              PIN солигдлоо. Дараагийн удаа шинэ PIN-ээрээ нэвтэрнэ.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-warn-line bg-warn-bg px-3 py-2 text-sm font-bold text-ink"
            >
              {error}
            </p>
          )}

          <form action={changePinAction} className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">Одоогийн PIN</span>
              <input
                name="current"
                required
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="current-password"
                placeholder="••••"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-xl tracking-[0.5em] text-ink placeholder:tracking-normal placeholder:text-ink-faint"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink-soft">Шинэ PIN</span>
              <input
                name="next"
                required
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="new-password"
                placeholder="••••"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-xl tracking-[0.5em] text-ink placeholder:tracking-normal placeholder:text-ink-faint"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-2xl bg-brand px-4 py-3.5 font-extrabold text-brand-ink hover:bg-brand-strong"
            >
              PIN солих
            </button>
          </form>
        </Card>
      </section>

      {profile.otherRoles.length > 0 && (
        <section>
          <SectionLabel>Өөр дүрээр орох</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {profile.otherRoles.map((role) => (
              <form action={switchRole} key={role}>
                <input type="hidden" name="role" value={role} />
                <button
                  type="submit"
                  className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm font-bold text-brand hover:border-brand"
                >
                  {ROLE_LABEL[role]}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Бусад</SectionLabel>
        <Row icon={LifeBuoy} tint="цэнхэр" title="Заавар" subtitle="Хэрхэн ашиглах вэ" href="/tuslamj" />
        <div className="mt-2">
          <Row icon={ShieldCheck} tint="саарал" title="Нууцлал" subtitle="Бид ямар мэдээлэл хадгалдаг вэ" href="/nuutslal" />
        </div>
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-warn-line bg-warn-bg px-4 py-3.5 font-extrabold text-accent"
        >
          <LogOut className="h-4 w-4" strokeWidth={2.6} />
          Гарах
        </button>
      </form>

      <p className="text-center text-xs text-ink-faint">
        Мэдээллээ өөрчлүүлэх бол{" "}
        <Link href="/holboo-barih" className="font-bold text-brand hover:underline">
          холбоо барина уу
        </Link>
        .
      </p>
    </AppShell>
  );
}
