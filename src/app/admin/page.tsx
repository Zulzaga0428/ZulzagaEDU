import { School, ShieldCheck } from "lucide-react";
import { readAdminSession, adminSecret } from "@/server/admin/session";
import { listSchools } from "@/server/admin/service";
import { CreateSchool } from "@/components/admin-create-school";
import { adminLoginAction, adminLogoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ — Zulzaga EDU", robots: { index: false, follow: false } };

/**
 * Админ — сургууль үүсгэх, явцыг харах.
 *
 * Энэ хуудас 2026-10-02-нд гарсан шалтгаан: 8 хоногийн дараа 4 ажилтан
 * Монголд сургуулиудтай уулзана. Өмнө нь сургууль үүсгэх ганц зам нь
 * Zulzaga-гийн компьютер дээрх терминал байв — уулзалтын дунд ажиллахгүй.
 *
 * ⚠️ Хайлтын системд ОРУУЛАХГҮЙ (`robots: noindex`).
 */

const ERRORS: Record<string, string> = {
  kod: "Код буруу байна.",
  ner: "Нэрээ бичнэ үү.",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const configured = adminSecret() !== null;
  const admin = await readAdminSession();
  const { aldaa } = await searchParams;

  if (!configured) {
    return (
      <main className="mx-auto w-full max-w-[480px] px-5 pt-16">
        <p className="rounded-2xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-bold text-ink">
          Админы код тохируулаагүй байна. Railway дээр{" "}
          <code className="font-mono">ADMIN_SECRET</code> нэмнэ үү (дор хаяж 12 тэмдэгт).
        </p>
      </main>
    );
  }

  if (!admin) {
    const error = typeof aldaa === "string" ? ERRORS[aldaa] : undefined;
    return (
      <main className="mx-auto w-full max-w-[420px] px-5 pb-16 pt-16">
        <header className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-soft">
            <ShieldCheck className="h-7 w-7 text-brand" strokeWidth={2.2} />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-navy">Админ</h1>
          <p className="mt-1 text-sm text-ink-soft">Сургууль үүсгэх, явцыг харах.</p>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-bold text-ink"
          >
            {error}
          </p>
        )}

        <form action={adminLoginAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-ink">Таны нэр</span>
            <input
              name="who"
              required
              placeholder="Болд"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
            />
            <span className="mt-1 block text-xs text-ink-faint">
              Хэн ямар сургууль үүсгэснийг бүртгэнэ.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-ink">Админы код</span>
            <input
              name="code"
              required
              type="password"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand px-4 py-4 text-lg font-extrabold text-brand-ink hover:bg-brand-strong"
          >
            Нэвтрэх
          </button>
        </form>
      </main>
    );
  }

  const list = await listSchools();
  const totals = list.reduce(
    (a, s) => ({
      teachers: a.teachers + s.teachers,
      students: a.students + s.students,
      homework: a.homework + s.homework,
    }),
    { teachers: 0, students: 0, homework: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-[560px] space-y-5 px-5 pb-16 pt-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Админ</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-navy">Сургуулиуд</h1>
          <p className="mt-0.5 text-sm text-ink-soft">{admin.who}</p>
        </div>
        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink-faint hover:border-accent hover:text-accent"
          >
            Гарах
          </button>
        </form>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { v: list.length, l: "Сургууль" },
          { v: totals.teachers, l: "Багш" },
          { v: totals.students, l: "Сурагч" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-surface px-3 py-4 text-center">
            <p className="text-2xl font-extrabold text-navy">{s.v}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{s.l}</p>
          </div>
        ))}
      </div>

      <CreateSchool />

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
          Үүссэн сургуулиуд
        </h2>
        {list.length === 0 ? (
          <p className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-6 text-sm text-ink-soft">
            <School className="h-5 w-5 shrink-0 text-ink-faint" />
            Одоогоор сургууль алга.
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((s) => (
              <div key={s.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate font-bold text-ink">{s.name}</p>
                  <p className="shrink-0 font-mono text-xs text-ink-faint">{s.slug}</p>
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  {s.classes} анги · {s.teachers} багш · {s.students} сурагч ·{" "}
                  <span className={s.homework > 0 ? "font-bold text-brand" : ""}>
                    {s.homework} даалгавар
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-ink-faint">
        «Даалгавар» багана л жинхэнэ хэрэглээг харуулна. Бусад нь тохируулга.
      </p>
    </main>
  );
}
