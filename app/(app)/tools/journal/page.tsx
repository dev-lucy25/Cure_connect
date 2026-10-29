import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { listJournals } from "@/server/learning-repo";
import { AI_DAILY_LIMIT, getAiUsedToday } from "@/server/case-repo";
import { todayKst } from "@/lib/dates";
import LoginPrompt from "@/components/home/login-prompt";
import RoleNotice from "@/components/home/role-notice";
import PageHeader from "@/components/ui/page-header";
import { LearningSkeleton } from "@/components/ui/skeleton";
import JournalWriter from "@/components/tools/journal-writer";

export const metadata: Metadata = { title: "AI 실습일지 · NursePass" };

export default function JournalPage() {
  return (
    <div className="space-y-3">
      <Link href="/tools" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
        ← 실습 도구
      </Link>
      <Suspense fallback={<LearningSkeleton />}>
        <JournalContent />
      </Suspense>
    </div>
  );
}

async function JournalContent() {
  const user = await getOptionalUser();
  if (!user) return <LoginPrompt title="로그인하고 실습일지를 써요" body="오늘 메모만 남기면 AI가 성찰 일지 초안을 만들어 줘요" />;
  if (user.role !== "student") return <RoleNotice title="학생 계정 전용 화면이에요" body="실습일지는 실습 학생용이에요" />;
  const [items, used] = await Promise.all([listJournals(user.id), getAiUsedToday(user.id)]);
  return (
    <div className="space-y-4">
      <PageHeader title="AI 실습일지" description="오늘 메모 → 성찰 일지 초안 → 고쳐서 저장" />
      <JournalWriter items={items} today={todayKst()} left={Math.max(0, AI_DAILY_LIMIT - used)} />
    </div>
  );
}
