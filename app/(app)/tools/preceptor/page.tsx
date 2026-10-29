import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { attemptStats, listMissed } from "@/server/learning-repo";
import { AI_DAILY_LIMIT, getAiUsedToday } from "@/server/case-repo";
import LoginPrompt from "@/components/home/login-prompt";
import RoleNotice from "@/components/home/role-notice";
import PageHeader from "@/components/ui/page-header";
import { LearningSkeleton } from "@/components/ui/skeleton";
import PreceptorQuiz from "@/components/tools/preceptor-quiz";

export const metadata: Metadata = { title: "AI 프리셉터 모의질문 · NursePass" };

export default function PreceptorPage() {
  return (
    <div className="space-y-3">
      <Link href="/tools" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
        ← 실습 도구
      </Link>
      <Suspense fallback={<LearningSkeleton />}>
        <PreceptorContent />
      </Suspense>
    </div>
  );
}

async function PreceptorContent() {
  const user = await getOptionalUser();
  if (!user)
    return <LoginPrompt title="로그인하고 프리셉터 질문에 답해 봐요" body="AI가 답변을 평가하고, 틀린 질문은 오답노트에 모아 줘요" />;
  if (user.role !== "student") return <RoleNotice title="학생 계정 전용 화면이에요" body="모의 구술질문은 실습 학생용이에요" />;
  const [missed, stats, used] = await Promise.all([listMissed(user.id), attemptStats(user.id), getAiUsedToday(user.id)]);
  return (
    <div className="space-y-4">
      <PageHeader
        title="AI 프리셉터 모의질문"
        description={
          stats.count ? `지금까지 ${stats.count}번 답했어요 · 평균 ${stats.avg}점` : "병동 선생님이 실제로 묻는 질문에 답해 봐요"
        }
      />
      <PreceptorQuiz missed={missed} left={Math.max(0, AI_DAILY_LIMIT - used)} />
    </div>
  );
}
