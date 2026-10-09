import Link from "next/link";
import { ExternalLink, Globe, MapPin, Phone, School } from "lucide-react";
import type { SchoolProfile } from "@/server/school/profile";

/**
 * «Манай сургууль» — бүх дүрийн профайл дээр.
 *
 * Хоосон талбарыг харуулахгүй: зөвхөн нэртэй сургууль ч цэвэрхэн харагдана.
 * Холбоосууд `school/profile.ts`-д http(s) гэж шалгагдсан тул энд шууд
 * `href` болгож болно.
 */
export function SchoolCard({ profile, canEdit }: { profile: SchoolProfile; canEdit: boolean }) {
  const host = (u: string) => {
    try {
      return new URL(u).host.replace(/^www\./, "");
    } catch {
      return u;
    }
  };

  return (
    /*
      `Card` өөрөө `p-4`-тэй — `p-0` дамжуулбал аль нь ялахыг CSS-ийн дараалал
      шийднэ. Байрны зураг хүрээндээ наалдах ёстой тул энд шууд бичив.
    */
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_1px_2px_rgba(18,38,63,0.04)]">
      {profile.photoFileId && (
        // eslint-disable-next-line @next/next/no-img-element -- эрх шалгадаг замаар ирнэ
        <img
          src={`/api/file/${profile.photoFileId}`}
          alt={profile.name}
          className="h-36 w-full object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {profile.logoFileId ? (
            // eslint-disable-next-line @next/next/no-img-element -- эрх шалгадаг замаар ирнэ
            <img
              src={`/api/file/${profile.logoFileId}`}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl border border-line bg-surface object-contain p-1"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-soft">
              <School className="h-6 w-6 text-ink-faint" strokeWidth={2} />
            </span>
          )}
          <p className="min-w-0 flex-1 text-lg font-extrabold leading-tight text-navy">{profile.name}</p>
          {canEdit && (
            <Link
              href="/erhlegch/surguuli"
              className="shrink-0 rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-brand hover:border-brand"
            >
              Засах
            </Link>
          )}
        </div>

        <ul className="mt-3 space-y-2 text-sm">
          {profile.address && (
            <li className="flex items-start gap-2 text-ink-soft">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.2} />
              {profile.address}
            </li>
          )}
          {profile.phone && (
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.2} />
              <a href={`tel:${profile.phone.replace(/[^0-9+]/g, "")}`} className="font-bold text-brand">
                {profile.phone}
              </a>
            </li>
          )}
          {profile.website && (
            <li className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.2} />
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="font-bold text-brand">
                {host(profile.website)}
              </a>
            </li>
          )}
          {profile.facebook && (
            <li className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.2} />
              <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="font-bold text-brand">
                {host(profile.facebook)}
              </a>
            </li>
          )}
        </ul>

        {!profile.address && !profile.phone && !profile.website && !profile.facebook && canEdit && (
          <p className="mt-2 text-xs text-ink-faint">
            Хаяг, утас, холбоосоо нэмбэл багш, эцэг эх бүгд энд харна.
          </p>
        )}
      </div>
    </div>
  );
}
