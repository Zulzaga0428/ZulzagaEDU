"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import type { MembershipRole } from "@/server/auth/roles";
import { ROLE_HOME } from "@/server/auth/roles";
import { isActive, sideItems } from "@/components/nav-items";

/**
 * Компьютерийн хажуугийн цэс.
 *
 * ⚠️ Яагаад (Zulzaga, 2026-10-08): *«багш desktop бас их хэрэглэдэг гэнээ»*.
 * Апп нь энэ өдрийг хүртэл 480 пикселийн нэг багана байсан — 27 инчийн
 * дэлгэц дээр дунд нь нарийн тууз болж, тоглоом мэт харагддаг байв. Захирал,
 * багш анх нээхдээ юу хардаг нь итгэлийг шийддэг.
 *
 * `lg` (1024px)-ээс дээш л гарна. Доор нь доод nav хэвээр — утасны харагдац
 * огт хөндөгдөөгүй.
 */
export function SideNav({
  role,
  lang = false,
  points = false,
  schoolName,
  footer,
}: {
  role: MembershipRole;
  lang?: boolean;
  points?: boolean;
  schoolName?: string | null;
  /** Профайл, гарах — серверийн үйлдэл тул дээрээс дамжина. */
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = sideItems(role, lang, points);
  const home = ROLE_HOME[role];

  return (
    <nav
      aria-label="Хажуугийн цэс"
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 lg:flex"
    >
      <Link href={home} className="flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink">
          <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-extrabold leading-tight text-ink">
            Zulzaga EDU
          </span>
          {schoolName && (
            <span className="block truncate text-xs text-ink-faint">{schoolName}</span>
          )}
        </span>
      </Link>

      <ul className="mt-6 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, home);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${
                  active
                    ? "bg-role-teacher text-brand"
                    : "text-ink-soft hover:bg-surface-soft hover:text-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.6 : 2} />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {footer && <div className="mt-auto border-t border-line pt-3">{footer}</div>}
    </nav>
  );
}
