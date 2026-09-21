"use client";

import { useState } from "react";

/**
 * Зураг байхгүй үед эвдэрсэн зургийн тэмдэг гарахаас сэргийлнэ.
 *
 * Жинхэнэ зургуудыг `public/img/` дотор тавихад автоматаар солигдоно.
 * Хүртэл нь emoji харагдана — хоосон нүхнээс дээр.
 */
export function Art({
  src,
  fallback,
  alt = "",
  className = "",
}: {
  src: string;
  fallback: string;
  alt?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span role="img" aria-hidden className={`grid place-items-center ${className}`}>
        <span className="text-5xl">{fallback}</span>
      </span>
    );
  }

  return (
    // Өөрийн /public доторх файл тул энгийн img хангалттай.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />
  );
}
