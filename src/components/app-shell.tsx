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
import { publicVapidKey } from "@/server/notify/push";

/**
 * Аппын бүрхүүл.
 *
 * Дээд талд цагаан толгой карт: лого, нэрийн дугуй, дүрийн жижиг шошго,
 * мэндчилгээ. Доор нь хуудасны агуулга.
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
}: {
  viewer: Viewer;
  /** Дүрийн шошго. Өгөхгүй бол дүрийн нэр автоматаар. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  // Дүрийн жагсаалтыг энд уншихаа больсон — профайл өөрөө уншина. Дэлгэц
  // бүрд нэмэлт асуулга явуулах шалтгаан алга.
  const [[me], [school]] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, viewer.userId)).limit(1),
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, viewer.schoolId)).limit(1),
  ]);

  const initial = (me?.name ?? "?").trim().split(/\s+/).pop()?.[0] ?? "?";

  // Доод nav зөвхөн багшид. Түүний доор агуулга нуугдахгүйн тулд зай нэмнэ.
  const hasNav = viewer.role === "TEACHER";

  return (
    <div
      className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-[480px]"} px-4 pt-4 ${
        hasNav ? "pb-28" : "pb-16"
      }`}
    >
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

      <EnableNotifications vapidKey={publicVapidKey()} />

      <main className="mt-5 space-y-6">{children}</main>

      {hasNav && <BottomNav />}
    </div>
  );
}
