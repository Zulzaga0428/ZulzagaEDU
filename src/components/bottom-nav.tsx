"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Megaphone, Plus, Users } from "lucide-react";

/**
 * Натив апп шиг доод nav — **зөвхөн багшид**.
 *
 * Сурагч, эцэг эхэд нэг л дэлгэц байгаа тул тэдэнд nav гаргахгүй: ганц
 * товчтой самбар бол зай эзэлсэн чимэг. Тэдэнд 2 дахь очих газар гармагц
 * энд нэмнэ.
 *
 * Дунд нь товойсон дугуй — өдөрт хэд хэдэн удаа дардаг ганц үйлдэл.
 * Эрхий хуруунд хамгийн ойрхон байрлана.
 */

const LEFT = [
  { href: "/bagsh", label: "Нүүр", icon: Home },
  { href: "/bagsh/urilga", label: "Сурагч", icon: Users },
];

const RIGHT = [
  { href: "/bagsh/hovaari", label: "Хуваарь", icon: CalendarDays },
  { href: "/bagsh/zarlal", label: "Зарлал", icon: Megaphone },
];

function isActive(pathname: string, href: string) {
  // «Нүүр» бол яг таарсан үед л идэвхтэй — эс бөгөөс бүх дэд хуудсанд асна.
  return href === "/bagsh" ? pathname === href : pathname.startsWith(href);
}

function Item({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 ${
        active ? "text-brand" : "text-ink-faint hover:text-ink-soft"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
      <span className="truncate text-[11px] font-bold">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Үндсэн цэс"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-[480px] items-end justify-between gap-1 px-3 pt-1.5">
        {LEFT.map((it) => (
          <Item key={it.href} {...it} active={isActive(pathname, it.href)} />
        ))}

        <Link
          href="/bagsh/daalgavar/shine"
          aria-label="Даалгавар өгөх"
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
        >
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[0_8px_20px_rgba(43,133,246,0.35)]">
            <Plus className="h-6 w-6" strokeWidth={3} />
          </span>
          <span className="truncate text-[11px] font-bold text-brand">Даалгавар</span>
        </Link>

        {RIGHT.map((it) => (
          <Item key={it.href} {...it} active={isActive(pathname, it.href)} />
        ))}
      </div>
    </nav>
  );
}
