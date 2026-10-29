"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { Tab, TabIcon } from "@/components/nav/tabs";
import { IconBook, IconChart, IconCheckSquare, IconClock, IconNote } from "@/components/ui/icons";
import { SPRING_SNAPPY } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";

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

const MotionLink = motion.create(Link);

/** 선택된 탭 뒤의 민트 알약. 같은 layoutId끼리 탭을 옮기면 미끄러지듯 따라간다 */
function ActivePill({ layoutId }: { layoutId: string }) {
  return <motion.span layoutId={layoutId} transition={SPRING_SNAPPY} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-brand" />;
}

function TabList({ tabs, variant }: { tabs: Tab[]; variant: "bottom" | "top" }) {
  const isActive = useIsActive();
  const tap = useTapEffect();
  const bottom = variant === "bottom";
  const base = bottom
    ? "relative isolate flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-full text-caption font-bold"
    : "relative isolate inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-body-sm font-bold";
  const iconSize = bottom ? 20 : 18;

  return (
    <ul className={bottom ? "flex h-(--size-tab) items-center gap-1" : "flex items-center gap-1"}>
      {tabs.map((tab) => {
        const Icon = ICONS[tab.icon];
        const active = isActive(tab.href);
        return (
          <li key={tab.label} className={bottom ? "flex-1" : undefined}>
            {tab.href ? (
              <MotionLink
                href={tab.href}
                aria-current={active ? "page" : undefined}
                whileTap={tap}
                transition={SPRING_SNAPPY}
                className={`${base} ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {active && <ActivePill layoutId={`tab-pill-${variant}`} />}
                <Icon size={iconSize} strokeWidth={active ? 2.2 : 1.8} />
                {tab.label}
              </MotionLink>
            ) : (
              <span aria-disabled className={`${base} cursor-not-allowed text-ink-soft/45`}>
                <Icon size={iconSize} />
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
  );
}

// 모바일 하단 탭 바: 아이콘 + 글자, 선택 탭은 민트 알약 배경. 앱 폭(480px) 가운데에 붙는다. md 이상에서는 숨김
export default function BottomTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-(--width-app) border-t border-line bg-surface/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <TabList tabs={tabs} variant="bottom" />
    </nav>
  );
}

// md 이상 상단 앱 바 안의 가로 탭
export function TopTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <nav aria-label="주요 메뉴" className="hidden md:block">
      <TabList tabs={tabs} variant="top" />
    </nav>
  );
}
