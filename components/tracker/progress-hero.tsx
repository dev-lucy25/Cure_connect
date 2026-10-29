import NurseTurtle, { turtleStage } from "@/components/mascot/nurse-turtle";
import Card from "@/components/ui/card";
import GoalEditor from "@/components/tracker/goal-editor";

const BADGE_STEP = 100;

function formatHours(hours: number) {
  return hours.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

// 맨 위 진행률: 큰 숫자, 남은 시간, 둥근 진행 바, 단계별 거북이, 100시간마다 배지
export default function ProgressHero({
  totalMinutes,
  goalHours,
  editable = true,
}: {
  totalMinutes: number;
  goalHours: number;
  /** 로그인 전 예시 화면에서는 목표를 바꿀 수 없다 */
  editable?: boolean;
}) {
  const hours = totalMinutes / 60;
  const percent = Math.min(100, Math.floor((hours / goalHours) * 100));
  const remaining = Math.max(0, goalHours - hours);
  const badgeCount = Math.min(30, Math.floor(goalHours / BADGE_STEP));
  const earned = Math.min(badgeCount, Math.floor(hours / BADGE_STEP));
  const nextBadge = (earned + 1) * BADGE_STEP;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-bold text-ink-soft">누적 실습 시간</p>
          <p className="mt-1 font-display leading-none whitespace-nowrap">
            <span className="text-display text-ink">{formatHours(hours)}</span>
            <span className="text-title text-ink-soft"> / {goalHours.toLocaleString("ko-KR")}시간</span>
          </p>
          <p className="mt-2 text-body-sm text-ink-soft">
            {remaining > 0 ? (
              <>
                졸업까지 <b className="text-ink">{formatHours(remaining)}시간</b> 남았어요
              </>
            ) : (
              "목표 달성! 졸업을 축하해요"
            )}
          </p>
        </div>
        <NurseTurtle stage={turtleStage(percent)} mood={percent >= 100 ? "saved" : "default"} size={76} className="-mt-1 shrink-0" />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="실습 시간 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3 flex-1 overflow-hidden rounded-full bg-cream-deep"
        >
          <div
            className="h-full rounded-full bg-mint-deep transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(percent, hours > 0 ? 3 : 0)}%` }}
          />
        </div>
        <span className="w-10 text-right font-display text-title text-mint-deep">{percent}%</span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-1" aria-label={`100시간 배지 ${badgeCount}개 중 ${earned}개 획득`}>
          {Array.from({ length: badgeCount }, (_, i) => (
            <li key={i} aria-hidden className={`size-2.5 rounded-full ${i < earned ? "bg-pink-deep" : "bg-cream-deep"}`} />
          ))}
        </ul>
        <p className="shrink-0 text-caption text-ink-soft">
          {earned < badgeCount ? `다음 배지 ${nextBadge}시간까지 ${formatHours(nextBadge - hours)}시간` : "배지를 모두 모았어요"}
        </p>
      </div>

      {editable && <GoalEditor goalHours={goalHours} />}
    </Card>
  );
}
