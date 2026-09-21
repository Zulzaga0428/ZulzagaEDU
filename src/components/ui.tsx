import Link from "next/link";
import type { ComponentType, ReactNode } from "react";

/**
 * Дэлгэцүүдийн нийтлэг хэсгүүд.
 *
 * Zulzaga-гийн макетын хэв маяг: цагаан дугуй булантай карт, зөөлөн өнгийн
 * дүрсний дөрвөлжин, хэсгийн жижиг гарчиг. Энд нэг дор байгаагийн учир нь
 * дөрвөн дашбоард ижил харагдах ёстой.
 */

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type Tint = "цэнхэр" | "ногоон" | "ягаан" | "шар" | "саарал";

const TINT_BG: Record<Tint, string> = {
  цэнхэр: "bg-role-teacher",
  ногоон: "bg-role-parent",
  ягаан: "bg-role-student",
  шар: "bg-warn-bg",
  саарал: "bg-surface-soft",
};

const TINT_FG: Record<Tint, string> = {
  цэнхэр: "text-dot-teacher",
  ногоон: "text-dot-parent",
  ягаан: "text-dot-student",
  шар: "text-accent",
  саарал: "text-ink-soft",
};

/** Дүрсний зөөлөн дөрвөлжин — жагсаалтын мөр бүрийн зүүн талд. */
export function IconBox({
  icon: Ico,
  tint = "цэнхэр",
  size = "жижиг",
}: {
  icon: Icon;
  tint?: Tint;
  size?: "жижиг" | "том";
}) {
  const box = size === "том" ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-xl";
  const glyph = size === "том" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center ${box} ${TINT_BG[tint]}`}
    >
      <Ico className={`${glyph} ${TINT_FG[tint]}`} strokeWidth={2.2} />
    </span>
  );
}

/** Хэсгийн жижиг гарчиг. */
export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">{children}</h2>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(18,38,63,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Өнгөт онцлох карт — дэлгэцийн эхэнд нэг удаа. */
export function FeatureCard({
  icon,
  tint = "ногоон",
  eyebrow,
  title,
  children,
}: {
  icon: Icon;
  tint?: Tint;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`flex items-start gap-4 rounded-3xl p-5 ${TINT_BG[tint]}`}>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
            {eyebrow}
          </p>
        )}
        <p className="mt-0.5 text-xl font-extrabold text-navy">{title}</p>
        {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
      </div>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70">
        <IconBoxGlyph icon={icon} tint={tint} />
      </span>
    </div>
  );
}

function IconBoxGlyph({ icon: Ico, tint }: { icon: Icon; tint: Tint }) {
  return <Ico className={`h-6 w-6 ${TINT_FG[tint]}`} strokeWidth={2.2} />;
}

/** Тооны хавтан — эгнээнд 2–4 ширхэг. */
export function StatTile({
  value,
  label,
  tone = "энгийн",
}: {
  value: ReactNode;
  label: string;
  tone?: "энгийн" | "онцлох";
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 text-center">
      <p
        className={`text-2xl font-extrabold ${tone === "онцлох" ? "text-brand" : "text-ink"}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-faint">{label}</p>
    </div>
  );
}

/**
 * Жагсаалтын мөр — дүрс, гарчиг, тайлбар, баруун талд утга.
 *
 * `href` өгвөл линк, эс бөгөөс энгийн мөр болно.
 */
export function Row({
  icon,
  tint,
  title,
  subtitle,
  trailing,
  href,
}: {
  icon?: Icon;
  tint?: Tint;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      {icon && <IconBox icon={icon} tint={tint} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{title}</span>
        {subtitle && <span className="block text-xs text-ink-faint">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </>
  );

  const shell =
    "flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3";

  return href ? (
    <Link href={href} className={`${shell} transition-colors hover:border-brand`}>
      {inner}
    </Link>
  ) : (
    <div className={shell}>{inner}</div>
  );
}

/** Явцын шугам. */
export function Bar({ percent, label }: { percent: number; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="block h-2 w-full overflow-hidden rounded-full bg-surface-soft"
    >
      <span
        className="block h-full rounded-full bg-brand"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </span>
  );
}

/** Хоосон төлөв — тасархай хүрээтэй, зэмлэлгүй. */
export function Empty({ icon, children }: { icon?: Icon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-line px-4 py-10 text-center text-ink-soft">
      {icon && <IconBox icon={icon} tint="саарал" size="том" />}
      <p className="text-sm">{children}</p>
    </div>
  );
}
