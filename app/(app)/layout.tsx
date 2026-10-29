import { Suspense } from "react";
import TabBar, { TabBarSkeleton } from "@/components/nav/tab-bar";

// 로그인한 화면 공통 틀. 탭 바는 로그인 정보를 읽으므로 Suspense 안에서 스트리밍한다.
// 교수용 세로 메뉴(data-nav=side)가 있으면 넓은 화면에서 본문을 오른쪽으로 민다.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col lg:has-[[data-nav=side]]:pl-60">
      <main className="mx-auto w-full max-w-120 flex-1 px-4 pt-6 pb-[calc(var(--size-tab)+env(safe-area-inset-bottom)+24px)]">
        {children}
      </main>
      <Suspense fallback={<TabBarSkeleton />}>
        <TabBar />
      </Suspense>
    </div>
  );
}
