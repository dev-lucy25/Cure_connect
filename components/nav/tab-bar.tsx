import Link from "next/link";
import { getOptionalUser } from "@/server/auth";
import { TABS } from "@/components/nav/tabs";
import BottomTabs, { TopTabs } from "@/components/nav/tab-links";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import ThemeToggle from "@/components/theme/theme-toggle";
import { IconUser } from "@/components/ui/icons";
import { getCredits } from "@/server/notes-repo";
import CreditBadge from "@/components/credits/credit-badge";
import { unreadCount } from "@/server/notification-repo";
import NotificationBell from "@/components/notifications/notification-bell";
import { DemoRoleBar } from "@/components/home/demo-login";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { demoLoginPassword } from "@/lib/env/server";

// 상단 앱 바와 하단 탭 바. 역할·로그인 여부는 서버에서 읽는다(같은 요청 안에서 한 번만 조회).
// md 이상에서는 탭이 앱 바 가운데로 올라오고 하단 탭 바는 숨는다.

function AppBarShell({ nav, children, top }: { nav?: React.ReactNode; children?: React.ReactNode; top?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
      {top}
      <div className="mx-auto flex h-(--size-appbar) max-w-(--width-app) items-center justify-between gap-2 px-5 md:max-w-(--width-wide) md:gap-6 md:px-8">
        <Link href="/" className="press flex min-h-11 shrink-0 items-center gap-1.5" aria-label="NursePass 홈">
          <NurseTurtle stage={2} size={32} decorative still />
          <span className="font-display text-title text-ink">NursePass</span>
        </Link>
        <div className="hidden flex-1 md:block">{nav}</div>
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
  // 학생은 크레딧 배지(충전소) + 알림 + 내 정보, 교수는 알림 + 내 정보, 로그인 전에는 로그인 버튼.
  // 크레딧·안 읽은 알림 수는 자주 바뀌므로 캐시하지 않고 요청마다 읽는다
  // 체험 계정이면 맨 위에 학생 ↔ 교수 전환 바 (체험이 켜져 있을 때만)
  const demoRole =
    user && demoLoginPassword() !== null
      ? ((Object.keys(DEMO_ACCOUNTS) as (keyof typeof DEMO_ACCOUNTS)[]).find((r) => DEMO_ACCOUNTS[r].email === user.email) ?? null)
      : null;
  const [credits, unread] = await Promise.all([
    user?.role === "student" ? getCredits(user.id) : null,
    user ? unreadCount(user.id) : 0,
  ]);
  return (
    <AppBarShell nav={<TopTabs tabs={TABS[user?.role ?? "guest"]} />} top={demoRole && <DemoRoleBar role={demoRole} />}>
      {credits !== null && <CreditBadge credits={credits} />}
      {user && <NotificationBell unread={unread} />}
      {user ? (
        <Link
          href="/me"
          aria-label="내 정보"
          className="press inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-body-sm font-bold text-ink-soft hover:text-ink md:px-3"
        >
          <IconUser size={22} />
          <span className="hidden max-w-24 truncate md:inline">{user.name}</span>
        </Link>
      ) : (
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
      className="fixed inset-x-0 bottom-0 z-20 mx-auto h-[calc(var(--size-tab)+env(safe-area-inset-bottom))] max-w-(--width-app) border-t border-line bg-surface md:hidden"
    />
  );
}
