import type { Role } from "@/generated/prisma/client";

export type Tab = {
  label: string;
  icon: string;
  /** 아직 없는 화면은 null → "곧 열려요" 비활성 탭 */
  href: string | null;
};

export const TABS: Record<Role, Tab[]> = {
  student: [
    { label: "트래커", icon: "⏱️", href: "/" },
    { label: "케이스", icon: "📝", href: null },
    { label: "족보", icon: "📚", href: null },
    { label: "마이", icon: "🐻", href: null },
  ],
  professor: [
    { label: "학생 현황", icon: "📊", href: "/" },
    { label: "채점", icon: "✅", href: null },
    { label: "마이", icon: "🐻", href: null },
  ],
};
