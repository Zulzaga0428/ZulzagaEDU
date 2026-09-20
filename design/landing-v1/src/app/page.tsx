import Link from "next/link";
import { LogIn, Plus, Zap, ShieldCheck, HelpCircle, Mail } from "lucide-react";
import { RoleCard } from "@/components/landing/role-card";
import { BackgroundBlobs, BottomLandscape } from "@/components/landing/decor";

const roles = [
  {
    variant: "teacher" as const,
    title: "Багш",
    description: "Анги үүсгэж, сурагчдаа удирдана.",
    href: "/join/teacher",
    image: "/img/teacher.png",
    emoji: "👩‍🏫",
  },
  {
    variant: "parent" as const,
    title: "Эцэг эх",
    description: "Хүүхдийнхээ ангид багшийн QR-аар нэгдэнэ.",
    href: "/join/parent",
    image: "/img/parent.png",
    emoji: "👨‍👩‍👦",
  },
  {
    variant: "student" as const,
    title: "Сурагч",
    description: "Багшийн өгсөн мэдээллээр ангид нэгдэнэ.",
    href: "/join/student",
    image: "/img/student.png",
    emoji: "🎒",
  },
];

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <BackgroundBlobs />

      {/* PWA тэмдэг */}
      <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-2 text-sm font-bold text-muted ring-1 ring-black/5 backdrop-blur">
          <Zap className="h-4 w-4 fill-current" strokeWidth={0} />
          PWA
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-5 pb-48 pt-16 sm:px-8 sm:pt-20">
        {/* Лого */}
        <div className="flex flex-col items-center text-center">
          {/* Логоны зургийг /public/img/logo.png-д тавина */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/logo.png"
            alt="Zulzaga EDU"
            className="h-24 w-auto"
            // Зураг байхгүй үед хоосон зай үлдээхгүй
            style={{ minHeight: 0 }}
          />

          <h1 className="mt-4 text-5xl font-extrabold leading-none tracking-tight text-navy sm:text-6xl">
            Zulzaga
            <span className="mt-1 block text-brand-500">EDU</span>
          </h1>

          <p className="mt-5 max-w-[34ch] text-lg leading-relaxed text-muted">
            Сургууль, багш, эцэг эх, сурагчийг нэг дор холбоно.
          </p>
        </div>

        {/* Үндсэн үйлдлүүд */}
        <div className="mx-auto mt-9 flex w-full max-w-md flex-col gap-4">
          <Link
            href="/login"
            className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-brand-600 text-xl font-extrabold text-white shadow-[0_10px_24px_rgba(30,125,242,0.28)] transition-colors hover:bg-brand-700"
          >
            <LogIn className="h-6 w-6" strokeWidth={2.5} />
            Нэвтрэх
          </Link>

          <Link
            href="/join"
            className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-brand-500/70 bg-white/80 text-xl font-extrabold text-brand-600 transition-colors hover:bg-white"
          >
            <Plus className="h-6 w-6" strokeWidth={3} />
            Zulzaga-д нэгдэх
          </Link>
        </div>

        {/* Үүрэг сонгох */}
        <div className="mt-14">
          <div className="mx-auto flex max-w-lg items-center gap-4">
            <span className="h-px flex-1 bg-slate-300/70" />
            <h2 className="text-lg font-extrabold text-navy">Та хэн бэ?</h2>
            <span className="h-px flex-1 bg-slate-300/70" />
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {roles.map((role) => (
              <RoleCard key={role.variant} {...role} />
            ))}
          </div>
        </div>

        {/* Уриа */}
        <div className="mt-20 flex items-center justify-center gap-4">
          <span className="h-px w-8 bg-slate-300" />
          <p className="max-w-[26ch] text-center text-lg font-semibold leading-relaxed text-muted">
            Жижиг алхам өнөөдөр, том ирээдүй маргааш.
          </p>
          <span className="h-px w-8 bg-slate-300" />
        </div>
      </div>

      <BottomLandscape />

      <footer className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-5 pb-7 text-sm text-muted sm:flex-row sm:justify-between sm:px-8">
        <nav className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/privacy" className="inline-flex items-center gap-2 hover:text-brand-600">
            <ShieldCheck className="h-4 w-4" />
            Нууцлал
          </Link>
          <Link href="/help" className="inline-flex items-center gap-2 hover:text-brand-600">
            <HelpCircle className="h-4 w-4" />
            Тусламж
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-2 hover:text-brand-600">
            <Mail className="h-4 w-4" />
            Холбоо барих
          </Link>
        </nav>
        <p className="text-faint">© {new Date().getFullYear()} Zulzaga EDU</p>
      </footer>
    </main>
  );
}
