import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoleNotice from "@/components/home/role-notice";
import PrivacyNotice from "@/components/home/privacy-notice";
import { Suspense } from "react";
import { getCurrentUser } from "@/server/auth";
import { AI_DAILY_LIMIT, getAiUsedToday, getCase, listChat } from "@/server/case-repo";
import { connectedProfessors, latestSubmissionForCase } from "@/server/submission-repo";
import { timeAgoFromNow } from "@/lib/dates";
import { idSchema } from "@/lib/validation/form";
import CaseAiPanel from "@/components/cases/case-ai-panel";
import CaseChat from "@/components/cases/case-chat";
import CaseEditor from "@/components/cases/case-editor";
import { CaseDetailSkeleton } from "@/components/ui/skeleton";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export const metadata: Metadata = { title: "케이스 · NursePass" };

export default function CaseDetailPage({ params }: PageProps<"/cases/[id]">) {
  return (
    <div className="space-y-3">
      <Link href="/cases" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
        ← 케이스 목록
      </Link>
      <PrivacyNotice />
      <Suspense fallback={<CaseDetailSkeleton />}>
        <CaseDetail params={params} />
      </Suspense>
    </div>
  );
}

async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 로그인 확인 → 내 케이스만. 남의 케이스나 없는 id는 똑같이 404로 보여 존재 여부도 알리지 않는다
  const user = await getCurrentUser();
  if (user.role !== "student") {
    return <RoleNotice title="학생 계정 전용 화면이에요" body="케이스 기록은 학생이 써요. 학생들이 낸 과제는 채점 화면에서 볼 수 있어요" />;
  }
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) notFound();
  const [found, usedToday, messages, submission, professors] = await Promise.all([
    getCase(user.id, parsed.data),
    getAiUsedToday(user.id),
    listChat(user.id, parsed.data),
    latestSubmissionForCase(user.id, parsed.data),
    connectedProfessors(user),
  ]);
  if (!found) notFound();
  const submittedAgo = submission ? timeAgoFromNow(submission.submittedAt) : null;

  return (
    <Stagger className="space-y-3">
      <StaggerItem>
        <CaseEditor initial={{ id: found.id, title: found.title, ward: found.ward, memo: found.memo }} />
      </StaggerItem>
      <StaggerItem>
        <CaseAiPanel
          caseId={found.id}
          caseTitle={found.title}
          professors={professors}
          submission={submission}
          submittedAgo={submittedAgo}
          ai={found.ai}
          stale={found.stale}
          usedToday={usedToday}
          limit={AI_DAILY_LIMIT}
        />
      </StaggerItem>
      <StaggerItem>
        <CaseChat caseId={found.id} messages={messages} usedToday={usedToday} limit={AI_DAILY_LIMIT} />
      </StaggerItem>
    </Stagger>
  );
}
