import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lane Changer — 전적 기반 포지션 추천",
  description: "최근 전적을 분석해서 당신에게 진짜 맞는 포지션과 챔피언을 알려드립니다. 팩트만 말합니다.",
  openGraph: {
    title: "Lane Changer — 전적 기반 포지션 추천",
    description: "최근 전적을 분석해서 당신에게 진짜 맞는 포지션과 챔피언을 알려드립니다. 팩트만 말합니다.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lane Changer — 전적 기반 포지션 추천",
    description: "최근 전적을 분석해서 당신에게 진짜 맞는 포지션과 챔피언을 알려드립니다. 팩트만 말합니다.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
