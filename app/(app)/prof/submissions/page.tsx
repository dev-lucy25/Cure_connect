import type { Metadata } from "next";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { listGradingSubmissions } from "@/server/submission-repo";
import { timeAgoFromNow } from "@/lib/dates";
import LoginPrompt from "@/components/home/login-prompt";
import RoleNotice from "@/components/home/role-notice";
import PageHeader from "@/components/ui/page-header";
import { GradingSkeleton } from "@/components/ui/skeleton";
import GradingBoard from "@/components/prof/grading-board";

export const metadata: Metadata = { title: "채점 · NursePass" };

export default function GradingPage() {
  return (
    <Suspense fallback={<GradingSkeleton />}>
      <GradingContent />
    </Suspense>
  );
}

// 교수 채점함: 같은 학교·같은 방 학생이 낸 케이스스터디
async function GradingContent() {
  const user = await getOptionalUser();
  if (!user)
    return <LoginPrompt title="로그인하고 과제를 채점해요" body="교수 계정으로 로그인하면 학생들이 낸 케이스스터디를 볼 수 있어요" />;
  if (user.role !== "professor") {
    return (
      <RoleNotice
        title="교수 계정 전용 화면이에요"
        body="내가 낸 과제와 채점 결과는 '내 제출'에서 볼 수 있어요"
        href="/submissions"
        action="내 제출로 가기"
      />
    );
  }
  const rows = (await listGradingSubmissions(user, "all")).map((r) => ({ ...r, ago: timeAgoFromNow(r.submittedAt) }));
  return (
    <div className="space-y-4">
      <PageHeader title="채점" description="같은 학교·같은 방 학생의 케이스스터디 과제" />
      <GradingBoard rows={rows} />
    </div>
  );
}
