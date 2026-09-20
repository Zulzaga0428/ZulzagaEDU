"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

export type RoleVariant = "teacher" | "parent" | "student";

const styles: Record<
  RoleVariant,
  { card: string; ring: string; art: string; dot: string }
> = {
  teacher: {
    card: "bg-role-teacher",
    ring: "hover:ring-brand-500/25",
    art: "bg-white/70",
    dot: "bg-dot-teacher",
  },
  parent: {
    card: "bg-role-parent",
    ring: "hover:ring-dot-parent/25",
    art: "bg-white/70",
    dot: "bg-dot-parent",
  },
  student: {
    card: "bg-role-student",
    ring: "hover:ring-dot-student/25",
    art: "bg-white/70",
    dot: "bg-dot-student",
  },
};

type Props = {
  variant: RoleVariant;
  title: string;
  description: string;
  href: string;
  /** /public/img/ доторх зургийн зам. Зураг байхгүй бол emoji fallback гарна. */
  image?: string;
  emoji: string;
};

export function RoleCard({
  variant,
  title,
  description,
  href,
  image,
  emoji,
}: Props) {
  const [broken, setBroken] = useState(false);
  const s = styles[variant];

  return (
    <Link
      href={href}
      aria-label={`${title} — ${description}`}
      className={`group flex flex-col items-center rounded-3xl ${s.card} px-5 pb-6 pt-6 text-center ring-1 ring-transparent transition-shadow ${s.ring} hover:shadow-[0_8px_30px_rgba(30,64,120,0.08)]`}
    >
      <div
        className={`mb-4 flex h-32 w-full items-center justify-center rounded-2xl ${s.art}`}
      >
        {image && !broken ? (
          // Гадаад зураг биш, өөрийн /public доторх файл тул энгийн img хангалттай.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-28 w-auto object-contain"
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="text-5xl" role="img" aria-hidden>
            {emoji}
          </span>
        )}
      </div>

      <h3 className="text-lg font-extrabold text-navy">{title}</h3>
      <p className="mt-2 max-w-[22ch] text-sm leading-relaxed text-muted">
        {description}
      </p>

      <span
        aria-hidden
        className={`mt-5 flex h-11 w-11 items-center justify-center rounded-full ${s.dot} text-white shadow-sm transition-transform group-hover:scale-105`}
      >
        <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
      </span>
    </Link>
  );
}
