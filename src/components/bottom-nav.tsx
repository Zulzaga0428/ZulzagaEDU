"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Languages,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Plus,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * Натив апп шиг доод nav.
 *
 * **Дунд нь товойсон дугуй** — тухайн дүрийн өдөр бүрийн гол зүйл. Багшид
 * «Даалгавар өгөх» (бүтээх үйлдэл), сурагчид «Хэл сурах».
 *
 * ⚠️ Доод nav бол ӨДӨР ТУТМЫН зүйлсийнх. Хичээлийн хуваарь багшийн хувьд
 * улиралд нэг удаа бөглөгддөг тул түүний nav-д байхгүй — харин сурагч
 * өдөр бүр хардаг тул сурагчийнхад байна. Ижил нэр, өөр давтамж.
 *
 * ⚠️ Сурагчид ЧАТ БАЙХГҮЙ (`docs/DECISIONS.md` §17). Хуучин аппад
 * «Хүүхдүүд» таб байсан — насанд хүрэгч хүүхэдтэй хувийн мессеж бичих
 * боломж. Сургуулиар дамжин тархдаг бүтээгдэхүүний хамгийн том эрсдэл тэр.
 * 5 дахь нүдэнд профайл.
 */

type Item = { href: string; label: string; icon: LucideIcon };

const TEACHER: { left: Item[]; center: Item; right: Item[] } = {
  left: [
    { href: "/bagsh", label: "Нүүр", icon: Home },
    { href: "/bagsh/urilga", label: "Сурагч", icon: Users },
  ],
  center: { href: "/bagsh/daalgavar/shine", label: "Даалгавар", icon: Plus },
  right: [
    { href: "/yaria", label: "Яриа", icon: MessageSquare },
    { href: "/bagsh/zarlal", label: "Зарлал", icon: Megaphone },
  ],
};

function studentNav(lang: boolean): { left: Item[]; center: Item; right: Item[] } {
  const left: Item[] = [
    { href: "/suragch", label: "Нүүр", icon: Home },
    { href: "/suragch/hovaari", label: "Хуваарь", icon: CalendarDays },
  ];
  const right: Item[] = [
    { href: "/suragch/daalgavar", label: "Даалгавар", icon: NotebookPen },
    { href: "/profil", label: "Профайл", icon: User },
  ];

  // Туг унтраалттай бол даалгавар нь дунд — сурагчийн өдөр бүрийн гол зүйл.
  return lang
    ? { left, center: { href: "/hel", label: "Хэл сурах", icon: Languages }, right }
    : {
        left,
        center: { href: "/suragch/daalgavar", label: "Даалгавар", icon: NotebookPen },
        right: [{ href: "/profil", label: "Профайл", icon: User }],
      };
}

function isActive(pathname: string, href: string, home: string) {
  // Нүүр бол яг таарсан үед л идэвхтэй — эс бөгөөс бүх дэд хуудсанд асна.
  return href === home ? pathname === href : pathname.startsWith(href);
}

function Cell({ item, active, home }: { item: Item; active: boolean; home: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 ${
        active ? "text-brand" : "text-ink-faint hover:text-ink-soft"
      }`}
      data-home={home}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
      <span className="truncate text-[11px] font-bold">{item.label}</span>
    </Link>
  );
}

export function BottomNav({ role, lang = false }: { role: MembershipRole; lang?: boolean }) {
  const pathname = usePathname();

  if (role !== "TEACHER" && role !== "STUDENT") return null;

  const nav = role === "TEACHER" ? TEACHER : studentNav(lang);
  const home = role === "TEACHER" ? "/bagsh" : "/suragch";
  const Center = nav.center.icon;

  return (
    <nav
      aria-label="Үндсэн цэс"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-[480px] items-end justify-between gap-1 px-3 pt-1.5">
        {nav.left.map((it) => (
          <Cell key={it.href} item={it} home={home} active={isActive(pathname, it.href, home)} />
        ))}

        <Link
          href={nav.center.href}
          aria-label={nav.center.label}
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
        >
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[0_8px_20px_rgba(43,133,246,0.35)]">
            <Center className="h-6 w-6" strokeWidth={role === "TEACHER" ? 3 : 2.4} />
          </span>
          <span className="truncate text-[11px] font-bold text-brand">{nav.center.label}</span>
        </Link>

        {nav.right.map((it) => (
          <Cell key={it.href} item={it} home={home} active={isActive(pathname, it.href, home)} />
        ))}
      </div>
    </nav>
  );
}
