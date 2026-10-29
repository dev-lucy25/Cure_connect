import type { CurrentUser } from "@/server/auth";
import { getProgress, listLogs, listUpcomingSchedules } from "@/server/practice-repo";
import { todayKst } from "@/lib/dates";
import PageHeader from "@/components/ui/page-header";
import DDayChip from "@/components/tracker/dday-chip";
import LogSection from "@/components/tracker/log-section";
import ProgressHero from "@/components/tracker/progress-hero";
import SchedulePanel from "@/components/tracker/schedule-panel";

// 학생 실습 시간 화면: 큰 제목 → 설명 → 히어로 카드 → 목록 카드(일지 타임라인, 실습 일정)
export default async function TrackerHome({ user }: { user: CurrentUser }) {
  const today = todayKst();
  const [progress, logs, schedules] = await Promise.all([
    getProgress(user.id),
    listLogs(user.id),
    listUpcomingSchedules(user.id, today),
  ]);

  return (
    <div className="space-y-3">
      <PageHeader title="실습 시간" description={`${user.name}님의 실습 기록`} />
      <div className="pt-2">
        <ProgressHero
          totalMinutes={progress.totalMinutes}
          goalHours={progress.goalHours}
          dday={<DDayChip next={schedules[0]} today={today} />}
        />
      </div>
      <div className="space-y-6 pt-3">
        <LogSection items={logs.items} nextCursor={logs.nextCursor} version={progress.logsVersion} today={today} />
        <SchedulePanel schedules={schedules} today={today} />
      </div>
    </div>
  );
}
