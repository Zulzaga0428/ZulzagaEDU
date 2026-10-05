import Link from "next/link";
import { eq } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { db } from "@/server/db";
import { schools, users } from "@/server/db/schema";
import { type Viewer } from "@/server/auth/access";
import { ROLE_LABEL } from "@/server/auth/roles";
import { signOut } from "@/app/login/actions";
import { EnableNotifications } from "@/components/enable-notifications";
import { BottomNav } from "@/components/bottom-nav";
import { langEnabled } from "@/server/lang/flag";
import { pointsEnabled } from "@/server/points/service";
import { publicVapidKey } from "@/server/notify/push";

export type HeroStat = { value: string; label: string };

/**
 * Аппын бүрхүүл.
 *
 * Хоёр хэлбэртэй:
 *
 *  · **Энгийн** — цагаан толгой карт. Багш, эцэг эх, эрхлэгчид
 *  · **`hero`** — өнгөт градиент толгой, аватар, доор нь гурван тоо.
 *    Сурагчид. Оноо нь тусдаа карт байхаа больж энд орсон (Zulzaga,
 *    2026-10-06): хүүхдийн хувьд оноо бол хажуугийн мэдээлэл биш,
 *    аппыг нээх шалтгаан. Тиймээс хамгийн дээр.
 *
 * Эцэг эх, сурагч, багшид утасны өргөн; эрхлэгчид өргөн (`docs/DECISIONS.md` §11).
 */
export async function AppShell({
  viewer,
  eyebrow,
  title,
  subtitle,
  children,
  wide = false,
  hero,
}: {
  viewer: Viewer;
  /** Дүрийн шошго. Өгөхгүй бол дүрийн нэр автоматаар. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
  /** Өгвөл өнгөт толгой: аватар + гурван тоо. */
  hero?: { avatar: React.ReactNode; stats: HeroStat[] };
}) {
  // Дүрийн жагсаалтыг энд уншихаа больсон — профайл өөрөө уншина. Дэлгэц
  // бүрд нэмэлт асуулга явуулах шалтгаан алга.
  const [[me], [school]] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, viewer.userId)).limit(1),
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, viewer.schoolId)).limit(1),
  ]);

  const initial = (me?.name ?? "?").trim().split(/\s+/).pop()?.[0] ?? "?";

  // Доод nav багш, сурагчид. Түүний доор агуулга нуугдахгүйн тулд зай нэмнэ.
  const hasNav = viewer.role === "TEACHER" || viewer.role === "STUDENT";

  return (
    <div
      className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-[480px]"} px-4 pt-4 ${
        hasNav ? "pb-28" : "pb-16"
      }`}
    >
      {hero ? (
        /*
          Өнгөт толгой — градиент нь brand (цэнхэр) → dot-student (нил ягаан).
          Токеноор бичсэн: өнгө солиход энэ ч дагана.
        */
        <header
          className="rounded-3xl p-5 text-white shadow-[0_10px_24px_rgba(43,133,246,0.25)]"
          style={{
            backgroundImage:
              "linear-gradient(110deg, var(--brand) 0%, var(--dot-student) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-base font-extrabold tracking-tight text-white/90">
                zulzaga
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Link
                href="/profil"
                aria-label="Миний хуудас"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold text-white hover:bg-white/30"
              >
                {initial}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Гарах"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </form>
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <span className="shrink-0 rounded-full ring-2 ring-white/70">{hero.avatar}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-2xl font-extrabold leading-tight">{title}</span>
              {subtitle && <span className="block text-sm text-white/80">{subtitle}</span>}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {hero.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/20 px-2 py-3 text-center">
                <p className="text-xl font-extrabold leading-none">{s.value}</p>
                <p className="mt-1 text-[11px] leading-tight text-white/80">{s.label}</p>
              </div>
            ))}
          </div>
        </header>
      ) : (
      <header className="rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(18,38,63,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-brand-ink"
              >
                Z
              </span>
              <span className="text-lg font-extrabold tracking-tight text-navy">zulzaga</span>
            </span>
  
            <span className="flex items-center gap-2">
              {/* Нэрийн дугуй бол профайл руу орох зам — бүх дүрд, бүх дэлгэцээс. */}
              <Link
                href="/profil"
                aria-label="Миний хуудас"
                title={me?.name ?? ""}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-warn-bg text-sm font-extrabold text-accent ring-offset-2 hover:ring-2 hover:ring-brand"
              >
                {initial}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Гарах"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-faint hover:border-brand hover:text-brand"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </form>
            </span>
          </div>
  
          <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-accent">
            {eyebrow ?? ROLE_LABEL[viewer.role]}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
          <p className="mt-2 text-xs text-ink-faint">{school?.name ?? ""}</p>
  
          {/*
            Дүр сэлгэх нь одоо профайл дээр (`/profil`). Энд давхардуулбал
            дэлгэц бүрийн толгойд ховор хэрэглэдэг товч сууна.
          */}
        </header>
      )}

      <EnableNotifications vapidKey={publicVapidKey()} />

      <main className="mt-5 space-y-6">{children}</main>

      {hasNav && <BottomNav role={viewer.role} lang={langEnabled()} points={pointsEnabled()} />}
    </div>
  );
}
