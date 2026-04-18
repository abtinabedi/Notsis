import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Notsis — Ders Notu Hesaplayıcı",
  description:
    "Vize, ödev ve final notlarınızı girin, ağırlıklı ortalamayı anında hesaplayın. Öğrenciler için sade ve modern not hesaplama aracı.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
