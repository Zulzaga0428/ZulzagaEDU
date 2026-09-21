import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { readInvite } from "@/server/invite/service";
import { joinAsParent } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Эцэг эхийн нэгдэх хуудас.
 *
 * ⚠️ Энэ хуудас нь landing-ийг ДАЙРАХГҮЙ (`docs/DECISIONS.md` §11). Хүүхдийнхээ
 * даалгаврыг хайж байгаа ээжид худалдааны хуудас хэрэггүй.
 *
 * Линк нь ганцаараа хүүхдэд хүрэх эрх ОЛГОХГҮЙ — хүсэлт `PENDING` болж,
 * багш батлах хүртэл юу ч харагдахгүй.
 */

const ERRORS: Record<string, string> = {
  duutuu: "Мэдээлэл дутуу байна.",
  huchingui: "Урилга хүчингүй болсон эсвэл хугацаа нь дууссан байна. Багшаас шинийг аваарай.",
  "pin-sul": "PIN хэт амархан таамаглагдана. 1111, 1234 мэтийг сонгож болохгүй.",
  "pin-buruu": "Энэ дугаар аль хэдийн бүртгэлтэй байна. Өмнө тавьсан PIN-ээ оруулна уу.",
  "ali-hediin": "Та энэ хүүхэдтэй аль хэдийн холбогдсон байна.",
};

export default async function JoinPage({ params, searchParams }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const { aldaa } = await searchParams;
  const error = typeof aldaa === "string" ? ERRORS[aldaa] : undefined;

  const invite = await readInvite(token);

  if (!invite) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warn-bg">
          <CircleAlert className="h-8 w-8 text-accent" strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-extrabold text-navy">Урилга хүчингүй байна</h1>
        <p className="text-ink-soft">
          Хугацаа нь дууссан, эсвэл аль хэдийн ашиглагдсан байж магадгүй. Багшаасаа
          шинэ урилга аваарай.
        </p>
        <Link href="/login" className="mt-2 font-bold text-brand hover:underline">
          Нэвтрэх
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[480px] px-5 pb-16 pt-10">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">
          {invite.schoolName}
          {invite.className ? ` · ${invite.className} анги` : ""}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight text-navy">
          Та <span className="text-brand">{invite.studentName}</span>-ийн эцэг эх мөн үү?
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Мэдээллээ бөглөхөд багш танийг баталгаажуулна.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm font-semibold text-ink"
        >
          {error}
        </p>
      )}

      <form action={joinAsParent} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />

        <label className="block">
          <span className="text-sm font-bold text-ink">Таны нэр</span>
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Жишээ: Цэрэндоржийн Оюунтуяа"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-bold text-ink">Хэн болох</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {[
              ["MOTHER", "Ээж"],
              ["FATHER", "Аав"],
              ["GUARDIAN", "Асран хамгаалагч"],
            ].map(([value, label], i) => (
              <label
                key={value}
                className="flex cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-2 py-3 text-center text-sm font-bold text-ink has-[:checked]:border-brand has-[:checked]:bg-role-teacher has-[:checked]:text-brand"
              >
                <input
                  type="radio"
                  name="relation"
                  value={value}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-bold text-ink">Утасны дугаар</span>
          <input
            name="phone"
            required
            type="tel"
            inputMode="numeric"
            maxLength={20}
            placeholder="99112233"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg text-ink placeholder:text-ink-faint"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            Дараа нь үүгээрээ нэвтэрнэ.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-ink">4 оронтой PIN сонгох</span>
          <input
            name="pin"
            required
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="••••"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-2xl tracking-[0.5em] text-ink placeholder:tracking-normal placeholder:text-ink-faint"
          />
          <span className="mt-1 block text-xs text-ink-faint">
            1111, 1234 мэт амархан таамаглагдахыг сонгож болохгүй. Мартвал багш шинээр өгнө.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-2xl bg-brand px-4 py-4 text-lg font-extrabold text-brand-ink hover:bg-brand-strong"
        >
          Холбогдох
        </button>
      </form>

      <p className="mt-5 rounded-2xl bg-surface-soft px-4 py-3 text-center text-xs text-ink-soft">
        Хүүхдийн мэдээллийг хамгаалахын тулд багш хүсэлт бүрийг өөрөө хардаг.
        Баталгаажих хүртэл юу ч харагдахгүй.
      </p>
    </main>
  );
}
