import Link from "next/link";

export const metadata = { title: "Нууцлал — Zulzaga EDU" };

/**
 * Эхний ноорог. `docs/ERD.md`-д бодитоор хадгалагдаж байгаа өгөгдөлд
 * тулгуурлав — өөрчлөгдвөл энэ хуудас ч өөрчлөгдөнө.
 *
 * ⚠️ Хуулийн хяналт ОРООГҮЙ. Сургуультай гэрээ байгуулахаас өмнө
 * шалгуулах ёстой.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-5 pb-16 pt-12">
      <Link href="/" className="text-sm font-bold text-brand hover:underline">
        ← Буцах
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-navy">
        Нууцлалын бодлого
      </h1>
      <p className="mt-2 text-sm text-ink-faint">Ноорог · 2026 оны 9-р сар</p>

      <div className="mt-8 space-y-7 leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-lg font-extrabold text-navy">Бид юу цуглуулдаг вэ</h2>
          <p className="mt-2">
            <strong className="text-ink">Багш, эцэг эх, эрхлэгчээс:</strong> нэр, имэйл.
            Имэйлийг зөвхөн нэвтрэхэд ашиглана.
          </p>
          <p className="mt-2">
            <strong className="text-ink">Сурагчаас: имэйл цуглуулдаггүй.</strong> Хүүхэд
            өөрийн нэр, анги, нэвтрэх код гэсэн гурван зүйлтэй. Хүүхэд өөрөө данс
            үүсгэдэггүй — сургууль нь бүртгэнэ.
          </p>
          <p className="mt-2">
            <strong className="text-ink">Сурах явцаас:</strong> даалгавар хийсэн эсэх,
            хэзээ хийсэн, багшийн тэмдэглэл, сурагчийн илгээсэн зураг.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">Хэн харж чадах вэ</h2>
          <ul className="mt-2 space-y-1.5">
            <li>· Багш зөвхөн өөрийн заадаг ангийн сурагчдыг харна.</li>
            <li>· Эцэг эх зөвхөн өөрийн хүүхдийг харна — ангийн бусад хүүхдийг харахгүй.</li>
            <li>· Сурагч зөвхөн өөрийн даалгаврыг харна.</li>
            <li>
              · Эрхлэгч тоон үзүүлэлт харна. Даалгаврын агуулга, сурагчийн илгээсэн
              зургийг харахгүй.
            </li>
          </ul>
          <p className="mt-3">
            Эцэг эх, хүүхдийн холбоосыг <strong className="text-ink">багш баталгаажуулна</strong>.
            Хэн нэгэн өөрийгөө хүүхэдтэй өөрөө холбож чадахгүй.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">Бид юу хийдэггүй вэ</h2>
          <ul className="mt-2 space-y-1.5">
            <li>· Сурталчилгаа байхгүй.</li>
            <li>· Гуравдагч талын хянагч (tracker) байхгүй.</li>
            <li>· Өгөгдлийг зардаггүй, хуваалцдаггүй.</li>
            <li>· Байршил хянадаггүй.</li>
            <li>· Утасны хэрэглээг хянадаггүй.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">Устгах</h2>
          <p className="mt-2">
            Сургууль гэрээгээ дуусгавал тухайн сургуулийн бүх өгөгдөл устгагдана.
            Эцэг эх өөрийн хүүхдийн өгөгдлийг устгуулах хүсэлт гаргаж болно.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-extrabold text-navy">Холбогдох</h2>
          <p className="mt-2">
            Асуулт байвал{" "}
            <Link href="/holboo-barih" className="font-bold text-brand hover:underline">
              холбоо барих
            </Link>{" "}
            хуудсаар дамжуулна уу.
          </p>
        </section>
      </div>
    </main>
  );
}
