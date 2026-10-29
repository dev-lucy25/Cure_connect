import { Suspense } from "react";
import TabBar, { AppBar, AppBarSkeleton, TabBarSkeleton } from "@/components/nav/tab-bar";

// 모바일 퍼스트: PC에서도 폭 480px 폰 화면처럼 가운데 정렬.
// 상단 앱 바 + 본문(좌우 20px) + 하단 탭 바. 앱 바·탭 바는 로그인 정보를 읽으므로 Suspense 안에서 스트리밍한다.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-(--width-app) flex-1 flex-col bg-canvas">
      <Suspense fallback={<AppBarSkeleton />}>
        <AppBar />
      </Suspense>
      <main className="flex-1 px-5 pt-5 pb-[calc(var(--size-tab)+env(safe-area-inset-bottom)+28px)]">{children}</main>
      <Suspense fallback={<TabBarSkeleton />}>
        <TabBar />
      </Suspense>
    </div>
  );
}
