import {
  CalendarDays,
  Gift,
  Home,
  Languages,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Plus,
  Star,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MembershipRole } from "@/server/auth/roles";

/**
 * Цэсийн зүйлс — доод nav ба хажуугийн цэс ХОЁУЛАА эндээс уншина.
 *
 * ⚠️ Хоёр газар хуулж бичихгүй: нэг зам нэмэхэд нөгөөд нь мартвал багш
 * утсан дээр нэг зүйл, компьютер дээр өөр зүйл харна.
 *
 * Хоёр цэсийн ЯЛГАА нь зориудынх:
 *
 *   · **Доод nav** — утсан дээр, зөвхөн ӨДӨР ТУТМЫН 5 зам. Зай хомс.
 *   · **Хажуугийн цэс** — компьютер дээр, зай элбэг тул улиралд нэг удаа
 *     хэрэгтэй зүйлс ч (хуваарь) багтана.
 */

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Багшийн доод nav — дунд нь товойсон «Даалгавар өгөх». */
export const TEACHER_BOTTOM: { left: NavItem[]; center: NavItem; right: NavItem[] } = {
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

export function studentBottom(
  lang: boolean,
  points: boolean,
): { left: NavItem[]; center: NavItem; right: NavItem[] } {
  const home: NavItem = { href: "/suragch", label: "Нүүр", icon: Home };
  const profile: NavItem = { href: "/profil", label: "Профайл", icon: User };

  if (!points) {
    return {
      left: [home, { href: "/suragch/hovaari", label: "Хуваарь", icon: CalendarDays }],
      center: { href: "/suragch/daalgavar", label: "Даалгавар", icon: NotebookPen },
      right: [profile],
    };
  }

  const left = [home, { href: "/suragch/onoo", label: "Миний оноо", icon: Star }];
  const rewards: NavItem = { href: "/suragch/shagnal", label: "Урамшуулал", icon: Gift };

  // Хэл унтраалттай бол урамшуулал нь дунд — оноо цуглуулах шалтгаан тэнд.
  return lang
    ? {
        left,
        center: { href: "/hel", label: "Миний хэл", icon: Languages },
        right: [rewards, profile],
      }
    : { left, center: rewards, right: [profile] };
}

/**
 * Хажуугийн цэс — компьютер дээр. Доод nav-ын бүх зам + зай гарсан тул
 * нэмэгдсэн зүйлс.
 */
export function sideItems(
  role: MembershipRole,
  lang: boolean,
  points: boolean,
): NavItem[] {
  if (role === "TEACHER") {
    return [
      { href: "/bagsh", label: "Нүүр", icon: Home },
      { href: "/bagsh/daalgavar/shine", label: "Даалгавар өгөх", icon: Plus },
      { href: "/bagsh/urilga", label: "Сурагч ба эцэг эх", icon: Users },
      { href: "/bagsh/hovaari", label: "Хичээлийн хуваарь", icon: CalendarDays },
      { href: "/bagsh/zarlal", label: "Зарлал", icon: Megaphone },
      { href: "/yaria", label: "Яриа", icon: MessageSquare },
      { href: "/profil", label: "Профайл", icon: User },
    ];
  }

  if (role === "STUDENT") {
    const items: NavItem[] = [
      { href: "/suragch", label: "Нүүр", icon: Home },
      { href: "/suragch/daalgavar", label: "Миний даалгавар", icon: NotebookPen },
      { href: "/suragch/hovaari", label: "Хуваарь", icon: CalendarDays },
    ];
    if (points) {
      items.push(
        { href: "/suragch/onoo", label: "Миний оноо", icon: Star },
        { href: "/suragch/shagnal", label: "Урамшуулал", icon: Gift },
      );
    }
    if (lang) items.push({ href: "/hel", label: "Миний хэл", icon: Languages });
    items.push({ href: "/profil", label: "Профайл", icon: User });
    return items;
  }

  if (role === "PARENT") {
    return [
      { href: "/etseg-eh", label: "Нүүр", icon: Home },
      { href: "/yaria", label: "Багштай яриа", icon: MessageSquare },
      { href: "/profil", label: "Профайл", icon: User },
    ];
  }

  return [
    { href: "/erhlegch", label: "Нүүр", icon: Home },
    { href: "/erhlegch/bagsh", label: "Багш ба анги", icon: Users },
    { href: "/profil", label: "Профайл", icon: User },
  ];
}

/** Нүүр бол яг таарсан үед л идэвхтэй — эс бөгөөс бүх дэд хуудсанд асна. */
export function isActive(pathname: string, href: string, home: string) {
  return href === home ? pathname === href : pathname.startsWith(href);
}
