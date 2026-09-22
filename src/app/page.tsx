import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/access";
import { ROLE_HOME } from "@/server/auth/roles";
import { Art } from "@/components/landing/art";
import { BackgroundBlobs, BottomLandscape } from "@/components/landing/decor";

export const dynamic = "force-dynamic";

/**
 * Нүүр хуудас.
 *
 * ⚠️ Энэ хуудсын ажил бол **эрхлэгчийг** итгүүлэх (`docs/DECISIONS.md` §11).
 * Эцэг эх урилгын линкээр ирэхдээ энд ОРОХГҮЙ — шууд нэгдэх урсгал руу
 * очно. Тиймээс үндсэн товч нь «нэвтрэх» биш, «сургуульдаа нэвтрүүлэх».
 *
 * Гурван карт нь өөрөө бүртгүүлэх зам БИШ — багшийг эрхлэгч нэмнэ. Эдгээр
 * нь зүгээр л «энэ хүнд юу өгөх вэ» гэдгийг тайлбарлана.
 */

const ROLES = [
  {
    key: "teacher",
    title: "Багш",
    short: "Нэг удаа бич",
    text: "Даалгавраа нэг удаа бичихэд эцэг эх, сурагч хоёуланд нь очно. Хэн хийснийг тоолохгүй, жагсаалтаар харна.",
    card: "bg-role-teacher",
    dot: "bg-dot-teacher",
    img: "/img/teacher.png",
    emoji: "👩‍🏫",
  },
  {
    key: "parent",
    title: "Эцэг эх",
    short: "Хүүхдээ хар",
    text: "Хүүхдийнхээ даалгаврыг өөрийнх нь хуудаснаас харна. Группийн 40 мессеж ухах шаардлагагүй.",
    card: "bg-role-parent",
    dot: "bg-dot-parent",
    img: "/img/parent.png",
    emoji: "👨‍👩‍👦",
  },
  {
    key: "student",
    title: "Сурагч",
    short: "Юу хийхээ мэд",
    text: "Өнөөдөр юу хийхээ хардаг, хийснээ тэмдэглэдэг. Дэвтрийнхээ зургийг илгээнэ.",
    card: "bg-role-student",
    dot: "bg-dot-student",
    img: "/img/student.png",
    emoji: "🎒",
  },
];

export default async function LandingPage() {
  const viewer = await getViewer();
  if (viewer) redirect(ROLE_HOME[viewer.role]);

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <BackgroundBlobs />

      <span className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-2 text-xs font-bold text-ink-soft ring-1 ring-black/5 backdrop-blur sm:right-8 sm:top-7">
        ⚡ Татах шаардлагагүй
      </span>

      <div className="relative mx-auto w-full max-w-3xl px-5 pb-40 pt-10 sm:px-8 sm:pb-48 sm:pt-20">
        <header className="flex flex-col items-center text-center">
          <Art
            src="/img/logo.png"
            fallback="🐱"
            alt="Zulzaga EDU"
            className="h-24 w-auto object-contain"
          />

          <h1 className="mt-4 text-5xl font-extrabold leading-none tracking-tight text-navy sm:text-6xl">
            Zulzaga
            <span className="mt-1 block text-brand">EDU</span>
          </h1>

          <p className="mt-4 max-w-[30ch] text-base sm:mt-5 sm:text-lg leading-relaxed text-ink-soft">
            Даалгавар нэг газраас. Сургууль, багш, эцэг эх, сурагчийг нэг дор холбоно.
          </p>
        </header>

        <div className="mx-auto mt-7 flex w-full max-w-md sm:mt-9 flex-col gap-4">
          <Link
            href="/holboo-barih"
            className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-brand text-xl font-extrabold text-brand-ink shadow-[0_10px_24px_rgba(43,133,246,0.28)] transition-colors hover:bg-brand-strong"
          >
            Сургуульдаа нэвтрүүлэх
          </Link>

          <Link
            href="/login"
            className="flex h-14 items-center justify-center gap-3 rounded-2xl border-2 border-brand/60 bg-white/80 text-lg font-extrabold text-brand transition-colors hover:bg-white"
          >
            Нэвтрэх
          </Link>
        </div>

        <section className="mt-10 sm:mt-14">
          <div className="mx-auto flex max-w-lg items-center gap-4">
            <span className="h-px flex-1 bg-line" />
            <h2 className="text-lg font-extrabold text-navy">Хэнд юу өгөх вэ?</h2>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/*
            Утсан дээр гурвуулаа НЭГ ЭГНЭЭНД — өмнө нь дээрээс доош өрөгдөж
            хуудсыг хэт урт болгож байсан. Жижиг дэлгэцэд богино тайлбар,
            томоос нь бүтэн тайлбар гарна.
          */}
          <ul className="mt-6 grid grid-cols-3 gap-2.5 sm:mt-7 sm:gap-5">
            {ROLES.map((r) => (
              <li
                key={r.key}
                className={`flex flex-col items-center rounded-2xl sm:rounded-3xl ${r.card} px-2 pb-4 pt-4 text-center sm:px-5 sm:pb-6 sm:pt-6`}
              >
                <div className="mb-2 flex h-16 w-full items-center justify-center rounded-xl bg-white/70 sm:mb-4 sm:h-32 sm:rounded-2xl">
                  <Art
                    src={r.img}
                    fallback={r.emoji}
                    className="h-14 w-auto object-contain sm:h-28"
                  />
                </div>
                <h3 className="text-sm font-extrabold text-navy sm:text-lg">{r.title}</h3>
                <p className="mt-1 text-xs leading-snug text-ink-soft sm:hidden">{r.short}</p>
                <p className="mt-2 hidden text-sm leading-relaxed text-ink-soft sm:block">
                  {r.text}
                </p>
                <span
                  aria-hidden
                  className={`mt-3 h-1.5 w-8 rounded-full sm:mt-5 sm:h-2 sm:w-10 ${r.dot}`}
                />
              </li>
            ))}
          </ul>
        </section>

        <p className="mx-auto mt-10 max-w-[30ch] sm:mt-16 text-center text-lg font-semibold leading-relaxed text-ink-soft">
          Жижиг алхам өнөөдөр, том ирээдүй маргааш.
        </p>
      </div>

      <BottomLandscape />

      <footer className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-5 pb-7 text-sm text-ink-soft sm:flex-row sm:justify-between sm:px-8">
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/tuslamj" className="hover:text-brand">
            Тусламж
          </Link>
          <Link href="/nuutslal" className="hover:text-brand">
            Нууцлал
          </Link>
          <Link href="/holboo-barih" className="hover:text-brand">
            Холбоо барих
          </Link>
        </nav>
        <p className="text-ink-faint">© {new Date().getFullYear()} Zulzaga EDU</p>
      </footer>
    </div>
  );
}
