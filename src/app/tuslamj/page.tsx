import Link from "next/link";

export const metadata = { title: "Тусламж — Zulzaga EDU" };

/**
 * Нэг хуудас заавар — багш, эцэг эх, сурагчид.
 *
 * Нэвтрэлтгүй нээгдэнэ: эрхлэгч пилотын өмнө хэвлэж тараах, эсвэл багш
 * Messenger-ийн группэндээ линкээр нь тавих боломжтой. Хувийн мэдээлэл
 * агуулахгүй.
 *
 * Урт бичихгүй. Багш үүнийг 2 минутад уншиж дуусгах ёстой — илүү урт бол
 * уншихгүй, тэгвэл «хэрхэн ашиглахаа мэдэхгүй» гэж орхино.
 */

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-brand-ink"
      >
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-extrabold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{children}</p>
      </div>
    </li>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-accent">{label}</h2>
      <ol className="mt-4 space-y-4">{children}</ol>
    </section>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] space-y-5 px-5 pb-16 pt-10 print:pt-4">
      <Link href="/" className="text-sm font-bold text-brand hover:underline print:hidden">
        ← Буцах
      </Link>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Хэрхэн ашиглах вэ</h1>
        <p className="mt-2 text-ink-soft">2 минутын заавар. Хэвлэж болно.</p>
      </header>

      <Block label="Багш">
        <Step n={1} title="Нэвтрэх">
          Утасны дугаар болон эрхлэгчийн өгсөн PIN. Хэрэв «анги алга» гэвэл эрхлэгч
          тань ангид хуваарилаагүй байна — түүнд хэлээрэй.
        </Step>
        <Step n={2} title="Эцэг эхийг урих">
          «Сурагч ба эцэг эх» → хүүхдийн хажууд «Урилга» → QR гарна. Эцэг эх утсаараа
          уншина, эсвэл линкийг хуулж Messenger-ээр илгээнэ. Нэг урилгаар ээж, аав
          хоёулаа нэгдэж болно.
        </Step>
        <Step n={3} title="Эцэг эхийг батлах">
          Эцэг эх нэгдэхэд «Батлахыг хүлээж байна» хэсэгт гарна. Танихгүй хүн бол
          «Татгалзах». Батлах хүртэл тэр хүн хүүхдийн юуг ч харахгүй.
        </Step>
        <Step n={4} title="Даалгавар өгөх">
          «Даалгавар өгөх» → юу хийхээ бичээд «Илгээх». Хугацаа нь маргааш гэж
          урьдчилан тавигдсан байгаа. Илгээмэгц сурагч, эцэг эхийн утсанд очно.
        </Step>
        <Step n={5} title="Хэн хийснийг харах">
          Даалгавар дээр дарвал хийгээгүй хүүхэд эхэндээ гарна. Сурагчийн илгээсэн
          дэвтрийн зураг тэнд харагдана. «Шалгасан» дарж тэмдэглэл бичвэл хүүхэд,
          эцэг эх хоёулаа харна. Олон бол «Бүгдийг шалгасан».
        </Step>
        <Step n={6} title="Хүүхэд PIN-ээ мартвал">
          «Сурагч ба эцэг эх» → тэр хүүхдийн хажууд «PIN» → шинэ PIN гарна. Код нь
          өөрчлөгдөхгүй. PIN нэг л удаа харагддаг тул бичиж аваарай.
        </Step>
      </Block>

      <Block label="Эцэг эх">
        <Step n={1} title="Нэгдэх">
          Багшийн өгсөн QR-ыг уншуулж эсвэл линкийг дарж, нэр, утас, өөрийн сонгосон
          4 оронтой PIN-ээ оруулна. Багш батлахыг хүлээнэ.
        </Step>
        <Step n={2} title="Мэдэгдэл авах">
          Нэвтэрсний дараа «Шинэ даалгаврын мэдэгдэл авах» товч дарна.{" "}
          <strong className="text-ink">iPhone дээр:</strong> Safari-н доод талын ⬆️
          хуваалцах товч → «Дэлгэцэнд нэмэх». Үүнгүйгээр iPhone-д мэдэгдэл ирдэггүй.
        </Step>
        <Step n={3} title="Өдөр бүр">
          Оройн 8 цагт маргааш дуусах даалгаврын сануулга ирнэ — хүүхэд хийсэн бол
          ирэхгүй. Апп нээхэд дээд талд нэг өгүүлбэрээр хүүхдийн өнөөдрийн байдал
          харагдана.
        </Step>
      </Block>

      <Block label="Сурагч">
        <Step n={1} title="Нэвтрэх">
          Багшийн өгсөн код (жишээ нь 3A-K7QMX2) ба PIN.
        </Step>
        <Step n={2} title="Даалгавар хийх">
          Дэвтэртээ хийгээд «Дэвтрээ зурагдаж илгээх» дарна — камер нээгдэнэ. Зураг
          илгээхэд хийсэн гэж тэмдэглэгдэнэ.
        </Step>
      </Block>

      <p className="text-center text-sm text-ink-soft print:hidden">
        Асуулт байвал{" "}
        <Link href="/holboo-barih" className="font-bold text-brand hover:underline">
          холбоо барих
        </Link>
        .
      </p>
    </main>
  );
}
