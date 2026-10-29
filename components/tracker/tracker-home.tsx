import type { CurrentUser } from "@/server/auth";
import { getProgress, listLogs, listUpcomingSchedules } from "@/server/practice-repo";
import { logout } from "@/server/auth-actions";
import { todayKst } from "@/lib/dates";
import IconButton from "@/components/ui/icon-button";
import { IconLogout } from "@/components/ui/icons";
import ProgressHero from "@/components/tracker/progress-hero";
import ScheduleBanner from "@/components/tracker/schedule-banner";
import SchedulePanel from "@/components/tracker/schedule-panel";
import LogSection from "@/components/tracker/log-section";

// 학생 트래커. user는 서버에서 확인한 로그인 사용자다.
export default async function TrackerHome({ user }: { user: CurrentUser }) {
  const today = todayKst();
  const [progress, logs, schedules] = await Promise.all([
    getProgress(user.id),
    listLogs(user.id),
    listUpcomingSchedules(user.id, today),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="font-display text-title text-mint-deep">너스패스</p>
          <p className="text-body-sm text-ink-soft">{user.name}님, 오늘도 한 걸음</p>
        </div>
        <form action={logout}>
          <IconButton type="submit" label="로그아웃">
            <IconLogout size={20} />
          </IconButton>
        </form>
      </header>
      <ProgressHero totalMinutes={progress.totalMinutes} goalHours={progress.goalHours} />
      <ScheduleBanner next={schedules[0]} today={today} />
      <LogSection items={logs.items} nextCursor={logs.nextCursor} version={progress.logsVersion} today={today} />
      <SchedulePanel schedules={schedules} today={today} />
    </div>
  );
}
