import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { isDevLoginEnabled, listDevAccounts } from "@/server/auth/dev-login";
import { ROLE_HOME, ROLE_LABEL, type MembershipRole } from "@/server/auth/roles";
import { signInAs } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_ORDER: MembershipRole[] = ["ACADEMIC_MANAGER", "TEACHER", "PARENT", "STUDENT"];

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect(ROLE_HOME[viewer.role]);

  if (!isDevLoginEnabled()) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-3xl font-extrabold text-brand">Zulzaga EDU</h1>
        <p className="text-ink-soft">
          Нэвтрэлт хараахан нээгдээгүй байна. Сургуулиасаа урилга авна уу.
        </p>
      </main>
    );
  }

  const accounts = await listDevAccounts();
  const byRole = ROLE_ORDER.map((role) => ({
    role,
    people: accounts.filter((a) => a.role === role),
  })).filter((g) => g.people.length > 0);

  return (
    <main className="mx-auto w-full max-w-[480px] px-5 pb-16 pt-10">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand">Zulzaga EDU</h1>
        <p className="mt-2 text-sm text-ink-soft">Даалгавар нэг газраас.</p>
      </header>

      <p className="mt-6 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-ink-soft">
        <strong className="font-bold text-ink">Түр зуурын нэвтрэлт.</strong> Google
        нэвтрэлт орох хүртэл туршилтын хүмүүсээс сонгоно. Нууц үг асуухгүй тул
        жинхэнэ өгөгдөлтэй ажиллахаас өмнө хаагдана.
      </p>

      {accounts.length === 0 ? (
        <p className="mt-8 text-center text-ink-soft">
          Хэрэглэгч алга. <code className="font-mono">npm run db:seed</code> ажиллуулна уу.
        </p>
      ) : (
        <div className="mt-8 space-y-7">
          {byRole.map((group) => (
            <section key={group.role}>
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
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-4 text-left transition-colors hover:border-brand"
                      >
                        <span>
                          <span className="block font-bold text-ink">{p.name}</span>
                          <span className="block text-xs text-ink-faint">{p.schoolName}</span>
                        </span>
                        <span aria-hidden className="text-lg text-accent">
                          →
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
