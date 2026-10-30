"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Menu } from "@base-ui/react/menu";
import { logout } from "@/server/auth-actions";
import Avatar from "@/components/ui/avatar";
import { IconBell, IconLogout, IconUser } from "@/components/ui/icons";

// 앱 바 오른쪽 프로필 사진 → 계정 메뉴(내 정보 · 알림 · 로그아웃). PC·모바일 모두 같은 자리에서 로그아웃할 수 있다.
// Base UI Menu: 키보드(화살표·Esc)·화면 읽기 지원, 바깥을 누르면 닫힌다. 드롭다운(SelectField)과 같은 모양·움직임.

const ITEM =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-body-sm font-bold text-ink outline-none select-none data-highlighted:bg-subtle";

export default function AccountMenu({ name, email, avatarUrl, role }: { name: string; email: string; avatarUrl: string | null; role: string }) {
  const [leaving, startLeaving] = useTransition();
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="계정 메뉴"
        className="press inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-body-sm font-bold text-ink-soft outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-brand-deep data-popup-open:text-ink md:px-3"
      >
        <Avatar src={avatarUrl} size={30} />
        <span className="hidden max-w-24 truncate md:inline">{name}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup className="w-64 origin-(--transform-origin) rounded-popup border border-line bg-surface p-1.5 shadow-pop outline-none transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="flex items-center gap-3 px-3 pt-2 pb-3">
              <Avatar src={avatarUrl} size={40} />
              <div className="min-w-0">
                <p className="truncate text-body-sm font-bold text-ink">{name}</p>
                <p className="truncate text-caption text-ink-soft">
                  {role} · {email}
                </p>
              </div>
            </div>
            <div aria-hidden className="mx-2 mb-1 h-px bg-line" />
            <Menu.LinkItem render={<Link href="/me" />} className={ITEM}>
              <IconUser size={19} className="text-ink-soft" /> 내 정보
            </Menu.LinkItem>
            <Menu.LinkItem render={<Link href="/notifications" />} className={ITEM}>
              <IconBell size={19} className="text-ink-soft" /> 알림
            </Menu.LinkItem>
            <Menu.Item
              disabled={leaving}
              onClick={() => startLeaving(() => logout())}
              className={`${ITEM} text-danger data-highlighted:bg-danger-soft`}
            >
              <IconLogout size={19} /> {leaving ? "로그아웃하는 중..." : "로그아웃"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
