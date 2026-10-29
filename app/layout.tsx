import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
import "./globals.css";

// 제목 전용 폰트. 한글 글리프는 unicode-range로 필요한 조각만 받으므로 preload는 끈다.
const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "너스패스",
  description: "간호대생의 1,000시간 임상실습 파트너",
};

export const viewport: Viewport = {
  themeColor: "#fff8ec",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${jua.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-body text-ink">{children}</body>
    </html>
  );
}
