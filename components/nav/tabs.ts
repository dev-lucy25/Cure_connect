import type { Role } from "@/generated/prisma/client";

export type TabIcon = "clock" | "note" | "book" | "tool" | "chart" | "check";

export type Tab = {
  label: string;
  icon: TabIcon;
  /** 아직 없는 화면은 null → 흐린 비활성 탭 */
  href: string | null;
};

const STUDENT_TABS: Tab[] = [
  { label: "실습", icon: "clock", href: "/" },
  { label: "케이스", icon: "note", href: "/cases" },
  { label: "족보", icon: "book", href: "/notes" },
  { label: "도구", icon: "tool", href: "/tools" },
];

// guest: 로그인 전(오픈형). 학생과 같은 탭을 보여주고, 로그인이 필요한 화면은 각 화면에서 안내한다.
export const TABS: Record<Role | "guest", Tab[]> = {
  guest: STUDENT_TABS,
  student: STUDENT_TABS,
  professor: [
    { label: "학생 현황", icon: "chart", href: "/" },
    { label: "일지 인증", icon: "clock", href: "/prof/approvals" },
    { label: "채점", icon: "check", href: "/prof/submissions" },
  ],
};
