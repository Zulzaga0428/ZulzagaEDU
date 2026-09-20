import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// Nunito нь кирилл үсэг бүрэн дэмждэг тул монгол текст зөв харагдана.
const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zulzaga EDU — Сургууль, багш, эцэг эх, сурагчийг нэг дор",
  description:
    "Багш анги үүсгэж, эцэг эх QR-аар нэгдэж, сурагч даалгавраа нэг дор хийдэг сургалтын платформ.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Zulzaga EDU",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fbff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className={nunito.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
