import type { Role } from "@/generated/prisma/client";

export type TabIcon = "clock" | "note" | "book" | "user" | "login" | "chart" | "check";

export type Tab = {
  label: string;
  icon: TabIcon;
  /** 아직 없는 화면은 null → 흐린 비활성 탭 */
  href: string | null;
};

// guest: 로그인 전(오픈형). 둘러볼 수 있고, 기록하려면 로그인 탭으로 간다.
export const TABS: Record<Role | "guest", Tab[]> = {
  guest: [
    { label: "트래커", icon: "clock", href: "/" },
    { label: "케이스", icon: "note", href: null },
    { label: "족보", icon: "book", href: null },
    { label: "로그인", icon: "login", href: "/login" },
  ],
  student: [
    { label: "트래커", icon: "clock", href: "/" },
    { label: "케이스", icon: "note", href: null },
    { label: "족보", icon: "book", href: null },
    { label: "마이", icon: "user", href: null },
  ],
  professor: [
    { label: "학생 현황", icon: "chart", href: "/" },
    { label: "채점", icon: "check", href: null },
    { label: "마이", icon: "user", href: null },
  ],
};
