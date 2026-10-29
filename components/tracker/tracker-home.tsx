import type { CurrentUser } from "@/server/auth";
import { getProgress, getSubjectMinutes, listLogs, listUpcomingSchedules } from "@/server/practice-repo";
import { todayKst } from "@/lib/dates";
import PageHeader from "@/components/ui/page-header";
import ProfileBanner from "@/components/home/profile-banner";
import DDayChip from "@/components/tracker/dday-chip";
import LogSection from "@/components/tracker/log-section";
import ProgressHero from "@/components/tracker/progress-hero";
import SchedulePanel from "@/components/tracker/schedule-panel";
import SubjectBreakdown from "@/components/tracker/subject-breakdown";
import NextPracticeCard from "@/components/tracker/next-practice-card";

// 학생 실습 시간 화면.
// 모바일: 배너 → 히어로 → 실습 일정 → 과목별 현황 → 일지 (세로 한 줄)
// md 이상: 왼쪽 7칸(히어로, 과목별 현황) / 오른쪽 5칸(실습 일정), 그 아래 일지 전체 폭
export default async function TrackerHome({ user }: { user: CurrentUser }) {
  const today = todayKst();
  const [progress, subjectMinutes, logs, schedules] = await Promise.all([
    getProgress(user.id),
    getSubjectMinutes(user.id),
    listLogs(user.id),
    listUpcomingSchedules(user.id, today),
  ]);

  // 오늘이 기간 안에 있는 일정 = 현재 로테이션
  const current = schedules.find((s) => s.startDate <= today && (s.endDate ?? s.startDate) >= today);

  return (
    <div className="space-y-3">
      <PageHeader title="실습 시간" description={`${user.name}님의 실습 기록`} />
      <div className="pt-2">
        <ProfileBanner user={user} totalMinutes={progress.totalMinutes} goalHours={progress.goalHours} current={current} />
      </div>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-start">
        <div className="md:col-span-7">
          <ProgressHero
            totalMinutes={progress.totalMinutes}
            goalHours={progress.goalHours}
            dday={<DDayChip next={schedules[0]} today={today} />}
          />
        </div>
        <div className="space-y-4 md:col-span-5 md:row-span-2">
          {schedules[0] && <NextPracticeCard schedule={schedules[0]} today={today} />}
          <SchedulePanel schedules={schedules} today={today} />
        </div>
        <div className="md:col-span-7">
          <SubjectBreakdown minutes={subjectMinutes} />
        </div>
      </div>
      <div className="pt-3">
        <LogSection items={logs.items} nextCursor={logs.nextCursor} version={progress.logsVersion} today={today} />
      </div>
    </div>
  );
}
