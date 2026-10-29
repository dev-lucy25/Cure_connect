import { getOptionalUser } from "@/server/auth";
import { TABS } from "@/components/nav/tabs";
import TabLinks from "@/components/nav/tab-links";

// 역할은 서버에서 읽는다. 학생·비로그인은 항상 아래 탭 바, 교수는 넓은 화면(lg)에서 왼쪽 세로 메뉴.
export default async function TabBar() {
  const user = await getOptionalUser();
  const key = user?.role ?? "guest";
  return <TabLinks tabs={TABS[key]} side={key === "professor"} />;
}

export function TabBarSkeleton() {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 bottom-0 z-20 h-[calc(var(--size-tab)+env(safe-area-inset-bottom))] border-t border-line/70 bg-surface"
    />
  );
}
