"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Tab } from "@/components/nav/tabs";

export default function TabLinks({ tabs, side }: { tabs: Tab[]; side: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      data-nav={side ? "side" : "bottom"}
      className={`fixed inset-x-0 bottom-0 z-20 bg-surface pb-[env(safe-area-inset-bottom)] shadow-lift ${
        side ? "lg:inset-y-0 lg:right-auto lg:left-0 lg:w-60 lg:pt-8 lg:pb-0" : ""
      }`}
    >
      {side && (
        <p className="hidden px-6 pb-6 font-display text-headline text-mint-deep lg:block">너스패스</p>
      )}
      <ul className={`mx-auto flex max-w-120 ${side ? "lg:max-w-none lg:flex-col lg:gap-1 lg:px-3" : ""}`}>
        {tabs.map((tab) => {
          const active = tab.href !== null && pathname === tab.href;
          const base = `flex min-h-(--size-tab) flex-1 flex-col items-center justify-center gap-0.5 rounded-control text-caption font-bold ${
            side ? "lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-body" : ""
          }`;
          return (
            <li key={tab.label} className="flex flex-1 p-1">
              {tab.href ? (
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`${base} ${active ? "bg-mint-soft text-mint-deep" : "text-ink-soft hover:bg-cream"}`}
                >
                  <span aria-hidden className="text-title leading-none">
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              ) : (
                <span aria-disabled className={`${base} cursor-not-allowed text-ink-soft opacity-60`}>
                  <span aria-hidden className="text-title leading-none grayscale">
                    {tab.icon}
                  </span>
                  <span>
                    {tab.label}
                    <span className="sr-only"> (곧 열려요)</span>
                  </span>
                  <span aria-hidden className="text-[10px] leading-none text-pink-deep">
                    곧 열려요
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
