"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Tab, TabIcon } from "@/components/nav/tabs";
import { IconBook, IconChart, IconCheckSquare, IconClock, IconNote } from "@/components/ui/icons";

const ICONS: Record<TabIcon, typeof IconClock> = {
  clock: IconClock,
  note: IconNote,
  book: IconBook,
  chart: IconChart,
  check: IconCheckSquare,
};

// "/"는 정확히 같을 때만, 나머지는 하위 화면(/cases/123)에서도 켜진 상태로 본다
function useIsActive() {
  const pathname = usePathname();
  return (href: string | null) => href !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

// 모바일 하단 탭 바: 아이콘 + 글자, 선택 탭은 민트 알약 배경. 앱 폭(480px) 가운데에 붙는다. md 이상에서는 숨김
export default function BottomTabs({ tabs }: { tabs: Tab[] }) {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-(--width-app) border-t border-line bg-surface/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex h-(--size-tab) items-center gap-1">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon];
          const active = isActive(tab.href);
          const base = "press flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-full text-caption font-bold";
          return (
            <li key={tab.label} className="flex-1">
              {tab.href ? (
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`${base} ${active ? "bg-brand text-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  {tab.label}
                </Link>
              ) : (
                <span aria-disabled className={`${base} cursor-not-allowed text-ink-soft/45`}>
                  <Icon size={20} />
                  <span>
                    {tab.label}
                    <span className="sr-only"> (곧 열려요)</span>
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// md 이상 상단 앱 바 안의 가로 탭
export function TopTabs({ tabs }: { tabs: Tab[] }) {
  const isActive = useIsActive();

  return (
    <nav aria-label="주요 메뉴" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon];
          const active = isActive(tab.href);
          const base = "press inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-body-sm font-bold";
          return (
            <li key={tab.label}>
              {tab.href ? (
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`${base} ${active ? "bg-brand text-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  {tab.label}
                </Link>
              ) : (
                <span aria-disabled className={`${base} cursor-not-allowed text-ink-soft/45`}>
                  <Icon size={18} />
                  {tab.label}
                  <span className="sr-only"> (곧 열려요)</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
