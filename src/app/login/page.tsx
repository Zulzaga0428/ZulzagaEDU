import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { isDevLoginEnabled, listDevAccounts } from "@/server/auth/dev-login";
import { ROLE_HOME, ROLE_LABEL, type MembershipRole } from "@/server/auth/roles";
import { signInAs, signInWithPin } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_ORDER: MembershipRole[] = ["ACADEMIC_MANAGER", "TEACHER", "PARENT", "STUDENT"];

const ERRORS: Record<string, string> = {
  buruu: "Код эсвэл PIN буруу байна.",
  tugjeetei: "Олон удаа буруу оруулсан тул 15 минут түгжигдлээ.",
  gishuunchlelgui: "Танд сургуулийн эрх алга байна. Багштайгаа холбогдоно уу.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer();
  if (viewer) redirect(ROLE_HOME[viewer.role]);

  const { aldaa } = await searchParams;
  const error = typeof aldaa === "string" ? ERRORS[aldaa] : undefined;

  const devOn = isDevLoginEnabled();
  const accounts = devOn ? await listDevAccounts() : [];
  const byRole = ROLE_ORDER.map((role) => ({
    role,
    people: accounts.filter((a) => a.role === role),
  })).filter((g) => g.people.length > 0);

  return (
    <main className="mx-auto w-full max-w-[480px] px-5 pb-16 pt-10">
      <header className="text-center">
        <Link href="/" className="text-3xl font-extrabold tracking-tight text-brand">
          Zulzaga EDU
        </Link>
        <p className="mt-2 text-sm text-ink-soft">Даалгавар нэг газраас.</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-semibold text-ink"
        >
          {error}
        </p>
      )}

      <form action={signInWithPin} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-ink">Нэвтрэх код эсвэл утасны дугаар</span>
          <input
            name="identifier"
            required
            autoComplete="username"
            autoCapitalize="characters"
            placeholder="3A-K7QMX2"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-faint"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            Сурагч — багшийн өгсөн код. Эцэг эх, багш — утасны дугаар.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">PIN</span>
          <input
            name="pin"
            required
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="current-password"
            placeholder="••••"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-ink placeholder:tracking-normal placeholder:text-ink-faint"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-4 py-4 text-lg font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Нэвтрэх
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-ink-faint">
        PIN мартсан уу? Багшдаа хэлээрэй — шинээр өгнө.
      </p>

      {devOn && accounts.length > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <p className="rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-ink-soft">
            <strong className="font-bold text-ink">Зөвхөн хөгжүүлэлтэд.</strong> Доорх
            жагсаалт нууц үг асуухгүй тул жинхэнэ өгөгдөлтэй ажиллахаас өмнө хаагдана.
          </p>

          <div className="mt-5 space-y-6">
            {byRole.map((group) => (
              <div key={group.role}>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-faint">
                  {ROLE_LABEL[group.role]}
                </h2>
                <ul className="space-y-2">
                  {group.people.map((p) => (
                    <li key={`${p.userId}-${p.role}`}>
                      <form action={signInAs}>
                        <input type="hidden" name="userId" value={p.userId} />
                        <input type="hidden" name="schoolId" value={p.schoolId} />
                        <input type="hidden" name="role" value={p.role} />
                        <button
                          type="submit"
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-brand"
                        >
                          <span className="min-w-0 truncate font-bold text-ink">{p.name}</span>
                          <span aria-hidden className="shrink-0 text-brand">
                            →
                          </span>
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
