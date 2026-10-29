import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/motion/motion-provider";

// 로고 글자 전용 둥근 글꼴(본문·제목은 globals.css의 Pretendard). 한글 글리프는 unicode-range로 필요한 조각만 받으므로 preload는 끈다.
const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "NursePass",
  description: "간호대생의 1,000시간 임상실습 파트너",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#151311" },
  ],
  viewportFit: "cover",
};

// 첫 그림 전에 밝게/어둡게를 정한다 (저장된 선택 → 없으면 기기 설정). 깜빡임 방지
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 인라인 스크립트가 data-theme을 먼저 바꾸므로 html 속성 차이는 경고하지 않는다
    <html lang="ko" className={`${jua.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col text-body text-ink">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
