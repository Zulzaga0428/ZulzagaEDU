/**
 * Хүүхдийн аватарууд — оноогоор нээгддэг (`docs/DECISIONS.md` §18).
 *
 * Бүгд **inline SVG**: зургийн файл ч, гадны CDN ч байхгүй. Шалтгаан:
 *
 *  · Монголын мобайл датанд нэмэлт татах зүйл бүр удаашруулна
 *  · Emoji Windows дээр эвдэрдэг, утас бүрд өөр харагддаг
 *  · Өнгө, хэмжээг кодоор жигдэлж чадна
 *
 * Амьтад нь монгол хүүхдэд ойр: морь, тэмээ, бүргэд, хонь. Энгийн дүрсээр
 * зурсан тул 40px дээр ч танигдана.
 */

export type AvatarId =
  | "muur"
  | "nohoi"
  | "mori"
  | "temee"
  | "burged"
  | "honi"
  | "uneg"
  | "baavgai";

export type AvatarDef = {
  id: AvatarId;
  name: string;
  /** Онооны үнэ. `0` = бүгдэд нээлттэй, эхнээсээ байна. */
  cost: number;
  bg: string;
};

/**
 * Каталог. Эхний нь ҮНЭГҮЙ — хүүхэд бүр эхний өдрөөсөө аватартай байх
 * ёстой. Хоосон дугуйтай эхэлбэл шагнал биш, дутуу мэдрэмж төрүүлнэ.
 */
export const AVATARS: AvatarDef[] = [
  { id: "muur", name: "Муур", cost: 0, bg: "#DBEAFE" },
  { id: "nohoi", name: "Нохой", cost: 30, bg: "#FEF3C7" },
  { id: "honi", name: "Хонь", cost: 50, bg: "#E0F2FE" },
  { id: "uneg", name: "Үнэг", cost: 80, bg: "#FFE4D5" },
  { id: "mori", name: "Морь", cost: 120, bg: "#EDE9FE" },
  { id: "temee", name: "Тэмээ", cost: 160, bg: "#FEF9C3" },
  { id: "baavgai", name: "Баавгай", cost: 220, bg: "#F3E8D7" },
  { id: "burged", name: "Бүргэд", cost: 300, bg: "#E2E8F0" },
];

export const DEFAULT_AVATAR: AvatarId = "muur";

export function avatarDef(id: string | null | undefined): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

/** Нүд — бүх амьтанд ижил, тогтвортой байдал өгнө. */
function Eyes({ y = 42, dx = 9 }: { y?: number; dx?: number }) {
  return (
    <>
      <circle cx={50 - dx} cy={y} r="3.2" fill="#1E293B" />
      <circle cx={50 + dx} cy={y} r="3.2" fill="#1E293B" />
    </>
  );
}

function Muur() {
  return (
    <>
      <path d="M30 30 L34 14 L46 24 Z" fill="#94A3B8" />
      <path d="M70 30 L66 14 L54 24 Z" fill="#94A3B8" />
      <circle cx="50" cy="48" r="26" fill="#CBD5E1" />
      <Eyes />
      <path d="M44 56 Q50 61 56 56" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="52" r="2.5" fill="#F472B6" />
    </>
  );
}

function Nohoi() {
  return (
    <>
      {/* Унжсан чих — баавгайнаас ялгах гол шинж. */}
      <ellipse cx="24" cy="46" rx="9" ry="18" fill="#92400E" />
      <ellipse cx="76" cy="46" rx="9" ry="18" fill="#92400E" />
      <circle cx="50" cy="46" r="24" fill="#D97706" />
      <Eyes y={42} dx={9} />
      <ellipse cx="50" cy="60" rx="13" ry="10" fill="#FEF3C7" />
      <ellipse cx="50" cy="55" rx="4.5" ry="3.5" fill="#1E293B" />
      <path d="M50 58 L50 63 M50 63 Q45 66 42 63 M50 63 Q55 66 58 63"
        stroke="#1E293B" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  );
}

function Honi() {
  return (
    <>
      <circle cx="32" cy="30" r="12" fill="#F8FAFC" />
      <circle cx="50" cy="23" r="13" fill="#F8FAFC" />
      <circle cx="68" cy="30" r="12" fill="#F8FAFC" />
      <ellipse cx="22" cy="50" rx="7" ry="5" fill="#CBD5E1" />
      <ellipse cx="78" cy="50" rx="7" ry="5" fill="#CBD5E1" />
      <ellipse cx="50" cy="52" rx="20" ry="22" fill="#E2E8F0" />
      <Eyes y={48} dx={8} />
      <ellipse cx="50" cy="62" rx="6" ry="4" fill="#94A3B8" />
    </>
  );
}

function Uneg() {
  return (
    <>
      <path d="M24 36 L30 10 L46 28 Z" fill="#EA580C" />
      <path d="M76 36 L70 10 L54 28 Z" fill="#EA580C" />
      <path d="M28 34 L32 18 L44 30 Z" fill="#FDBA74" />
      <path d="M72 34 L68 18 L56 30 Z" fill="#FDBA74" />
      <circle cx="50" cy="46" r="24" fill="#F97316" />
      {/* Хурц хошуу — үнэгний гол шинж. */}
      <path d="M50 44 Q34 56 50 74 Q66 56 50 44 Z" fill="#FFF7ED" />
      <Eyes y={42} dx={10} />
      <circle cx="50" cy="62" r="3.5" fill="#1E293B" />
    </>
  );
}

function Mori() {
  return (
    <>
      {/* Босоо чих + дэл + урт хошуу — гурвуулаа байж морь гэж танигдана. */}
      <path d="M32 24 L36 6 L46 22 Z" fill="#78350F" />
      <path d="M68 24 L64 6 L54 22 Z" fill="#78350F" />
      <path d="M38 20 Q26 34 30 56 L40 52 Q36 34 46 24 Z" fill="#451A03" />
      <ellipse cx="52" cy="40" rx="20" ry="18" fill="#A16207" />
      <ellipse cx="52" cy="66" rx="14" ry="14" fill="#B45309" />
      <Eyes y={36} dx={11} />
      <ellipse cx="46" cy="68" rx="2.6" ry="3.6" fill="#1E293B" />
      <ellipse cx="58" cy="68" rx="2.6" ry="3.6" fill="#1E293B" />
      <path d="M44 76 Q52 80 60 76" stroke="#78350F" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Temee() {
  return (
    <>
      {/* Хоёр бөх нуруун ДЭЭР, урт хүзүү, жижиг толгой. */}
      <path d="M20 78 Q26 52 40 60 Q52 44 64 60 Q80 54 84 78 Z" fill="#D6C08C" />
      <path d="M58 62 Q60 40 66 26 L78 30 Q72 46 72 64 Z" fill="#E8D5A9" />
      <ellipse cx="74" cy="24" rx="13" ry="11" fill="#E8D5A9" />
      <ellipse cx="66" cy="16" rx="4" ry="5" fill="#C2A878" />
      <circle cx="70" cy="21" r="2.8" fill="#1E293B" />
      <circle cx="80" cy="21" r="2.8" fill="#1E293B" />
      <ellipse cx="76" cy="30" rx="7" ry="5" fill="#C2A878" />
      <circle cx="73" cy="29" r="1.4" fill="#1E293B" />
      <circle cx="79" cy="29" r="1.4" fill="#1E293B" />
    </>
  );
}

function Baavgai() {
  return (
    <>
      {/* Жижиг дугуй чих толгойн ДЭЭР — нохойн унжсан чихнээс ялгарна. */}
      <circle cx="28" cy="26" r="11" fill="#78350F" />
      <circle cx="72" cy="26" r="11" fill="#78350F" />
      <circle cx="28" cy="26" r="5" fill="#B45309" />
      <circle cx="72" cy="26" r="5" fill="#B45309" />
      <circle cx="50" cy="52" r="27" fill="#92400E" />
      <Eyes y={46} dx={10} />
      <ellipse cx="50" cy="62" rx="12" ry="10" fill="#D6C08C" />
      <ellipse cx="50" cy="57" rx="4.5" ry="3.5" fill="#1E293B" />
      <path d="M44 65 Q50 70 56 65" stroke="#1E293B" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function Burged() {
  return (
    <>
      {/* Шар тахир хушуу + хатуу хөмсөг — шувуу гэж шууд танигдана. */}
      <circle cx="50" cy="48" r="26" fill="#78350F" />
      <path d="M50 22 Q26 30 26 56 Q38 66 50 66 Q62 66 74 56 Q74 30 50 22 Z" fill="#F8FAFC" />
      <path d="M32 40 L46 44" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
      <path d="M68 40 L54 44" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
      <circle cx="41" cy="50" r="3.4" fill="#1E293B" />
      <circle cx="59" cy="50" r="3.4" fill="#1E293B" />
      <path d="M50 54 L57 62 Q50 72 43 62 Z" fill="#F59E0B" />
      <path d="M50 62 Q53 66 50 70" stroke="#B45309" strokeWidth="1.6" fill="none" />
    </>
  );
}

const SHAPES: Record<AvatarId, () => React.JSX.Element> = {
  muur: Muur,
  nohoi: Nohoi,
  honi: Honi,
  uneg: Uneg,
  mori: Mori,
  temee: Temee,
  baavgai: Baavgai,
  burged: Burged,
};

/** Аватарыг зурна. `locked` үед саарал болж, худалдаж авахыг харуулна. */
export function Avatar({
  id,
  size = 48,
  locked = false,
}: {
  id: string | null | undefined;
  size?: number;
  locked?: boolean;
}) {
  const def = avatarDef(id);
  const Shape = SHAPES[def.id];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={`shrink-0 rounded-full ${locked ? "opacity-40 grayscale" : ""}`}
      style={{ background: def.bg }}
    >
      <Shape />
    </svg>
  );
}
