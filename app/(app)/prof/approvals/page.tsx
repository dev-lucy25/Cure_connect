import type { Metadata } from "next";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { listPendingLogs } from "@/server/approval-repo";
import LoginPrompt from "@/components/home/login-prompt";
import RoleNotice from "@/components/home/role-notice";
import PageHeader from "@/components/ui/page-header";
import { ApprovalsSkeleton } from "@/components/ui/skeleton";
import ApprovalList from "@/components/prof/approval-list";

export const metadata: Metadata = { title: "일지 인증 · NursePass" };

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<ApprovalsSkeleton />}>
      <ApprovalsContent />
    </Suspense>
  );
}

// 교수 인증 대기함: 같은 학교·같은 방 학생의 실습 일지를 한 화면에서 인증·반려
async function ApprovalsContent() {
  const user = await getOptionalUser();
  if (!user)
    return <LoginPrompt title="로그인하고 실습 일지를 인증해요" body="교수 계정으로 로그인하면 학생들의 실습 시간을 인증할 수 있어요" />;
  if (user.role !== "professor") {
    return (
      <RoleNotice
        title="교수 계정 전용 화면이에요"
        body="내 일지의 인증 상태는 실습 홈의 일지 목록에서 볼 수 있어요"
        href="/"
        action="실습 홈으로"
      />
    );
  }
  const logs = await listPendingLogs(user);
  return (
    <div className="space-y-4">
      <PageHeader title="일지 인증" description="인증한 일지는 학생이 고치거나 지울 수 없어요" />
      <ApprovalList logs={logs} showStudent />
    </div>
  );
}
