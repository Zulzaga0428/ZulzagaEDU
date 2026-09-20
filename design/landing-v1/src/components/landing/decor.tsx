/**
 * Дэвсгэрийн чимэглэл — зөвхөн харагдах зориулалттай тул
 * screen reader-ээс нуусан (aria-hidden).
 */

export function BackgroundBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#e3edfc] opacity-70 blur-[2px]" />
      <div className="absolute -left-32 top-64 h-80 w-80 rounded-full bg-[#eaf1fd] opacity-60" />
      <div className="absolute right-[-10%] top-[38%] h-[28rem] w-[28rem] rounded-full bg-[#e7effb] opacity-50" />
    </div>
  );
}

export function BottomLandscape() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1024 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-[#dfe9f8]"
    >
      {/* Уулс */}
      <path
        d="M0 150 L90 96 L150 150 Z M120 150 L200 88 L280 150 Z"
        fill="currentColor"
        opacity="0.75"
      />
      {/* Мод */}
      <g fill="currentColor" opacity="0.8">
        <path d="M60 150 L74 116 L88 150 Z" />
        <rect x="71" y="148" width="6" height="12" rx="2" />
        <path d="M880 150 L896 112 L912 150 Z" />
        <rect x="893" y="148" width="6" height="12" rx="2" />
        <path d="M930 150 L942 122 L954 150 Z" />
        <rect x="939" y="148" width="6" height="12" rx="2" />
      </g>
      {/* Сургуулийн барилга */}
      <g fill="currentColor" opacity="0.85">
        <rect x="806" y="108" width="84" height="52" rx="4" />
        <path d="M806 108 L848 84 L890 108 Z" />
        <rect x="846" y="60" width="3" height="26" rx="1.5" />
        <path d="M849 62 L872 69 L849 76 Z" />
        <rect x="840" y="132" width="16" height="28" rx="3" fill="#f2f7fe" />
      </g>
      {/* Газрын шугам */}
      <path d="M0 160 H1024 V200 H0 Z" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
