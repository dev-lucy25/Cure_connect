import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getStudentDetail } from "@/server/approval-repo";
import { STATUS_TEXT, GRADUATION_HOURS, graduationPercent, practiceStatus } from "@/lib/practice-status";
import RoleNotice from "@/components/home/role-notice";
import AnimatedNumber from "@/components/motion/animated-number";
import ProgressBar from "@/components/motion/progress-bar";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import { StudentDetailSkeleton } from "@/components/ui/skeleton";
import SubjectBreakdown from "@/components/tracker/subject-breakdown";
import ApprovalList from "@/components/prof/approval-list";

export const metadata: Metadata = { title: "학생 상세 · NursePass" };

export default function StudentPage({ params }: PageProps<"/prof/students/[id]">) {
  return (
    <div className="space-y-3">
      <Link href="/" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
        ← 학생 현황
      </Link>
      <Suspense fallback={<StudentDetailSkeleton />}>
        <StudentContent params={params} />
      </Suspense>
    </div>
  );
}

// 학생 상세: 시간 요약(누적·인증·대기) → 과목별 현황 → 일지(인증·반려). 볼 수 없는 학생이면 404
async function StudentContent({ params }: Pick<PageProps<"/prof/students/[id]">, "params">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (user.role !== "professor")
    return <RoleNotice title="교수 계정 전용 화면이에요" body="내 기록은 실습 홈에서 볼 수 있어요" href="/" action="실습 홈으로" />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await getStudentDetail(user, id);
  if (!s) notFound();
  const hours = s.totalMinutes / 60;
  const status = STATUS_TEXT[practiceStatus(hours)];
  const percent = graduationPercent(hours);

  return (
    <Stagger className="space-y-3">
      <StaggerItem>
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-headline font-display text-ink">{s.name}</h1>
            <Chip tone={status.tone}>{status.label}</Chip>
          </div>
          <p className="mt-1 text-body-sm text-ink-soft">
            {[s.memberNo, s.classLabel, s.orgName, s.roomCode && `🔑 ${s.roomCode}`].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-4 font-display leading-none">
            <AnimatedNumber value={hours} className="text-display text-ink" />
            <span className="text-title text-ink-soft"> / {GRADUATION_HOURS.toLocaleString("ko-KR")}시간 · </span>
            <AnimatedNumber value={percent} suffix="%" className="text-title text-brand-deep" />
          </p>
          <ProgressBar
            percent={percent}
            minPercent={hours > 0 ? 3 : 0}
            label={`${s.name} 달성률`}
            className="mt-3 h-3 overflow-hidden rounded-full bg-subtle"
            barClassName="h-full rounded-full bg-brand"
          />
          <div className="mt-3 flex flex-wrap gap-2 text-body-sm">
            <Chip tone="brand">
              인증 완료 <AnimatedNumber value={s.approvedMinutes / 60} suffix="시간" />
            </Chip>
            <Chip tone="warn">
              인증 대기 <AnimatedNumber value={s.pendingMinutes / 60} suffix="시간" />
            </Chip>
          </div>
        </Card>
      </StaggerItem>
      <StaggerItem>
        <SubjectBreakdown minutes={s.subjectMinutes} />
      </StaggerItem>
      <StaggerItem className="space-y-2 pt-2">
        <h2 className="text-title font-bold">실습 일지 (최근 50개)</h2>
        <ApprovalList logs={s.logs} showStudent={false} />
      </StaggerItem>
    </Stagger>
  );
}
