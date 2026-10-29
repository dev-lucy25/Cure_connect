import type { CurrentUser } from "@/server/auth";
import { getProgress, getSubjectMinutes, listLogs, listPastSchedules, listUpcomingSchedules } from "@/server/practice-repo";
import { listChecklist } from "@/server/checklist-repo";
import { todayKst } from "@/lib/dates";
import PageHeader from "@/components/ui/page-header";
import ProfileBanner from "@/components/home/profile-banner";
import DDayChip from "@/components/tracker/dday-chip";
import LogSection from "@/components/tracker/log-section";
import ProgressHero from "@/components/tracker/progress-hero";
import SchedulePanel from "@/components/tracker/schedule-panel";
import SubjectBreakdown from "@/components/tracker/subject-breakdown";
import NextPracticeCard from "@/components/tracker/next-practice-card";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import ChecklistCard from "@/components/tracker/checklist-card";

// 학생 실습 시간 화면.
// 모바일: 배너 → 히어로 → 다음 실습 → 준비물 → 실습 일정 → 과목별 현황 → 일지 (세로 한 줄)
// md 이상: 왼쪽 7칸(히어로, 과목별 현황) / 오른쪽 5칸(다음 실습, 준비물, 실습 일정), 그 아래 일지 전체 폭
export default async function TrackerHome({ user }: { user: CurrentUser }) {
  const today = todayKst();
  const [progress, subjectMinutes, logs, schedules, checklist, pastSchedules] = await Promise.all([
    getProgress(user.id),
    getSubjectMinutes(user.id),
    listLogs(user.id),
    listUpcomingSchedules(user.id, today),
    listChecklist(user.id),
    listPastSchedules(user.id, today),
  ]);

  // 오늘이 기간 안에 있는 일정 = 현재 로테이션
  const current = schedules.find((s) => s.startDate <= today && (s.endDate ?? s.startDate) >= today);
  // D-day는 아직 시작 안 한 다음 실습 기준 (진행 중인 로테이션은 "진행 중"으로 따로)
  const upcoming = schedules.find((s) => s.startDate > today);

  // 카드들이 위에서부터 차례로 떠오르며 나타난다
  return (
    <Stagger className="space-y-3">
      <PageHeader title="실습 시간" description={`${user.name}님의 실습 기록`} />
      <StaggerItem className="pt-2">
        <ProfileBanner user={user} totalMinutes={progress.totalMinutes} current={current} />
      </StaggerItem>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start">
        <StaggerItem className="md:col-span-7">
          <ProgressHero
            totalMinutes={progress.totalMinutes}
            approvedMinutes={progress.approvedMinutes}
            pendingMinutes={progress.pendingMinutes}
            goalHours={progress.goalHours}
            dday={<DDayChip next={upcoming} current={current} today={today} />}
          />
        </StaggerItem>
        <StaggerItem className="space-y-4 md:col-span-5 md:row-span-2">
          {schedules[0] && <NextPracticeCard schedule={schedules[0]} today={today} />}
          <ChecklistCard items={checklist} />
          <SchedulePanel schedules={schedules} past={pastSchedules} today={today} />
        </StaggerItem>
        <StaggerItem className="md:col-span-7">
          <SubjectBreakdown minutes={subjectMinutes} />
        </StaggerItem>
      </div>
      <StaggerItem className="pt-3">
        <LogSection items={logs.items} nextCursor={logs.nextCursor} version={progress.logsVersion} today={today} />
      </StaggerItem>
    </Stagger>
  );
}
