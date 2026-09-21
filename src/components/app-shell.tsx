import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { schools, users } from "@/server/db/schema";
import { rolesOf, type Viewer } from "@/server/auth/access";
import { ROLE_LABEL } from "@/server/auth/roles";
import { signOut } from "@/app/login/actions";
import { switchRole } from "@/app/actions";
import { EnableNotifications } from "@/components/enable-notifications";
import { publicVapidKey } from "@/server/notify/push";

/**
 * Аппын бүрхүүл — эцэг эх, сурагч, багшид зориулсан утасны өргөнтэй багана.
 * Том дэлгэц дээр дунд нь төвлөрнө (`docs/DECISIONS.md` §11).
 */
export async function AppShell({
  viewer,
  children,
  wide = false,
}: {
  viewer: Viewer;
  children: React.ReactNode;
  /** Эрхлэгчийн самбар — компьютерт зориулсан өргөн хувилбар. */
  wide?: boolean;
}) {
  const [[me], [school], roles] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, viewer.userId)).limit(1),
    db.select({ name: schools.name }).from(schools).where(eq(schools.id, viewer.schoolId)).limit(1),
    rolesOf(viewer.userId, viewer.schoolId),
  ]);

  const otherRoles = roles.filter((r) => r !== viewer.role);

  return (
    <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-[480px]"} px-5 pb-16 pt-6`}>
      <header className="flex items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">
            {ROLE_LABEL[viewer.role]}
          </p>
          <p className="truncate text-lg font-extrabold text-ink">{me?.name ?? "—"}</p>
          <p className="truncate text-xs text-ink-faint">{school?.name ?? "—"}</p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink-soft hover:border-brand hover:text-brand"
          >
            Гарах
          </button>
        </form>
      </header>

      {otherRoles.length > 0 && (
        <nav
          aria-label="Дүр сэлгэх"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-soft px-3 py-2"
        >
          <span className="text-xs text-ink-soft">Өөр дүрээр:</span>
          {otherRoles.map((role) => (
            <form action={switchRole} key={role}>
              <input type="hidden" name="role" value={role} />
              <button
                type="submit"
                className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand hover:underline"
              >
                {ROLE_LABEL[role]}
              </button>
            </form>
          ))}
        </nav>
      )}

      <EnableNotifications vapidKey={publicVapidKey()} />

      <main className="mt-6">{children}</main>
    </div>
  );
}
