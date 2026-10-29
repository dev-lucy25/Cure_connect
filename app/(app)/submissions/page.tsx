import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getOptionalUser } from "@/server/auth";
import { listMySubmissions } from "@/server/submission-repo";
import { timeAgoFromNow } from "@/lib/dates";
import LoginPrompt from "@/components/home/login-prompt";
import RoleNotice from "@/components/home/role-notice";
import SubmissionStatusChip from "@/components/cases/submission-status-chip";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { SubmissionsSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "내 제출 · NursePass" };

export default function SubmissionsPage() {
  return (
    <Suspense fallback={<SubmissionsSkeleton />}>
      <SubmissionsContent />
    </Suspense>
  );
}

// 학생: 교수님께 낸 케이스스터디 과제와 채점 결과(학점·피드백)
async function SubmissionsContent() {
  const user = await getOptionalUser();
  if (!user) return <LoginPrompt title="로그인하고 제출 현황을 확인해요" body="케이스를 교수님께 제출하면 여기서 채점 결과를 볼 수 있어요" />;
  if (user.role !== "student") return <RoleNotice title="학생 계정 전용 화면이에요" body="학생들이 낸 과제는 학생 현황의 '채점 대기 과제'에서 볼 수 있어요" />;
  const items = await listMySubmissions(user.id);

  return (
    <Stagger className="space-y-3">
      <PageHeader
        title="내 제출"
        description="교수님께 낸 케이스스터디와 채점 결과"
        action={
          <Link href="/cases" className="inline-flex min-h-11 shrink-0 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
            ← 케이스
          </Link>
        }
      />
      {items.length === 0 ? (
        <StaggerItem className="pt-2">
          <Card className="flex flex-col items-center py-8 text-center">
            <NurseTurtle stage={3} mood="empty" size={88} decorative />
            <p className="mt-2 text-title font-bold">아직 제출한 과제가 없어요</p>
            <p className="mt-1 text-body-sm text-ink-soft">케이스를 SOAPIE로 정리한 뒤 “교수님께 과제 제출”을 눌러 보세요</p>
          </Card>
        </StaggerItem>
      ) : (
        <div className="grid gap-3 pt-2 md:grid-cols-2">
          {items.map((s) => (
            <StaggerItem key={s.id}>
              <article aria-label={s.title}>
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-title font-bold">{s.title}</p>
                      <p className="truncate text-body-sm text-ink-soft">
                        {s.ward} · {timeAgoFromNow(s.submittedAt)} 제출
                      </p>
                    </div>
                    <SubmissionStatusChip status={s.status} grade={s.grade} />
                  </div>
                  {s.feedback && <p className="rounded-control bg-subtle px-3 py-2 text-body-sm break-words whitespace-pre-line">💬 {s.feedback}</p>}
                  {s.caseId && (
                    <Link href={`/cases/${s.caseId}`} className="inline-flex min-h-11 items-center text-body-sm font-bold text-brand-deep">
                      케이스 열기 →
                    </Link>
                  )}
                </Card>
              </article>
            </StaggerItem>
          ))}
        </div>
      )}
    </Stagger>
  );
}
