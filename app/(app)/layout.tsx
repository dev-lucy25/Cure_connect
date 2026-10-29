import { Suspense } from "react";
import TabBar, { AppBar, AppBarSkeleton, TabBarSkeleton } from "@/components/nav/tab-bar";
import AppFooter from "@/components/nav/app-footer";

// 반응형: 모바일(<768px)은 폭 480px 안에서 상단 앱 바 + 본문 + 화면 아래 떠 있는 탭 바.
// 태블릿·PC(md 이상)는 본문 최대 1120px, 탭은 상단 앱 바 안으로 옮기고 하단 탭 바는 숨긴다.
// 앱 바·탭 바는 로그인 정보를 읽으므로 Suspense 안에서 스트리밍한다.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col bg-canvas md:max-w-(--width-wide)">
      <Suspense fallback={<AppBarSkeleton />}>
        <AppBar />
      </Suspense>
      <main className="flex-1 px-5 pt-5 pb-[calc(var(--size-tab)+env(safe-area-inset-bottom)+40px)] md:px-8 md:pt-8 md:pb-16">
        {children}
        <AppFooter />
      </main>
      <Suspense fallback={<TabBarSkeleton />}>
        <TabBar />
      </Suspense>
    </div>
  );
}
