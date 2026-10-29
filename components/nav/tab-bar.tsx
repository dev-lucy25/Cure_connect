import Link from "next/link";
import { getOptionalUser } from "@/server/auth";
import { TABS } from "@/components/nav/tabs";
import BottomTabs from "@/components/nav/tab-links";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import ThemeToggle from "@/components/theme/theme-toggle";

// 상단 앱 바와 하단 탭 바. 역할·로그인 여부는 서버에서 읽는다(같은 요청 안에서 한 번만 조회).

function AppBarShell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-(--size-appbar) max-w-(--width-app) items-center justify-between gap-2 px-5">
        <Link href="/" className="press flex min-h-11 items-center gap-1.5" aria-label="NursePass 홈">
          <NurseTurtle stage={2} size={32} decorative still />
          <span className="font-display text-title text-ink">NursePass</span>
        </Link>
        <div className="flex items-center gap-1">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export async function AppBar() {
  const user = await getOptionalUser();
  // 크레딧 배지는 족보 기능과 함께 붙인다. 로그인 전에는 그 자리에 로그인 버튼
  return (
    <AppBarShell>
      {!user && (
        <Link
          href="/login"
          className="press inline-flex min-h-11 items-center rounded-full bg-brand-soft px-4 text-body-sm font-bold text-brand-deep"
        >
          로그인
        </Link>
      )}
    </AppBarShell>
  );
}

export function AppBarSkeleton() {
  return <AppBarShell />;
}

export default async function TabBar() {
  const user = await getOptionalUser();
  return <BottomTabs tabs={TABS[user?.role ?? "guest"]} />;
}

export function TabBarSkeleton() {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 bottom-0 z-20 mx-auto h-[calc(var(--size-tab)+env(safe-area-inset-bottom))] max-w-(--width-app) border-t border-line bg-surface"
    />
  );
}
