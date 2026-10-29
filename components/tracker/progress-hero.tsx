import type { ReactNode } from "react";
import NurseTurtle, { turtleStage } from "@/components/mascot/nurse-turtle";
import Card from "@/components/ui/card";
import MilestoneConfetti from "@/components/ui/confetti";
import GoalEditor from "@/components/tracker/goal-editor";
import { DUTY_HOURS } from "@/lib/subjects";

const MILESTONE = 100;

function formatHours(hours: number) {
  return hours.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

// 히어로 카드: 거북이 + "312 / 1,000시간" 큰 숫자 + 두꺼운 진행 바 + 100시간마다 마일스톤 점 + (아래) D-Day 칩
export default function ProgressHero({
  totalMinutes,
  goalHours,
  dday,
  editable = true,
}: {
  totalMinutes: number;
  goalHours: number;
  /** 히어로 아래쪽에 붙는 D-Day 칩 */
  dday?: ReactNode;
  /** 로그인 전 예시 화면에서는 목표를 바꿀 수 없다 */
  editable?: boolean;
}) {
  const hours = totalMinutes / 60;
  const percent = Math.min(100, Math.floor((hours / goalHours) * 100));
  const remaining = Math.max(0, goalHours - hours);
  const milestones = Math.min(30, Math.floor(goalHours / MILESTONE));
  const earned = Math.min(milestones, Math.floor(hours / MILESTONE));

  return (
    <Card className="relative overflow-hidden">
      {editable && <MilestoneConfetti earned={earned} />}
      <div className="flex items-center gap-4">
        <span className="grid size-20 shrink-0 place-items-center rounded-card bg-brand-soft">
          <NurseTurtle stage={turtleStage(percent)} mood={percent >= 100 ? "saved" : "default"} size={72} />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-bold text-ink-soft">누적 실습 시간 · {percent}%</p>
          <p className="mt-1 font-display leading-none whitespace-nowrap">
            <span className="text-display text-ink">{formatHours(hours)}</span>
            <span className="text-title text-ink-soft"> / {goalHours.toLocaleString("ko-KR")}시간</span>
          </p>
          <p className="mt-2 text-body-sm text-ink-soft">
            {remaining > 0 ? (
              <>
                졸업 기준까지 <b className="text-ink">{formatHours(remaining)}시간</b> (약 {Math.ceil(remaining / DUTY_HOURS)}일 듀티)
                남음
              </>
            ) : (
              "졸업 기준 달성"
            )}
          </p>
        </div>
      </div>

      {/* 두꺼운 둥근 진행 바 + 100시간마다 얇은 눈금선(마일스톤) */}
      <div
        role="progressbar"
        aria-label={`실습 시간 진행률, 100시간 마일스톤 ${milestones}개 중 ${earned}개 달성`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="relative mt-5 h-4 overflow-hidden rounded-full bg-subtle"
      >
        <div className="animate-bar-fill h-full rounded-full bg-brand" style={{ width: `${Math.max(percent, hours > 0 ? 3 : 0)}%` }} />
        {Array.from({ length: milestones - 1 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute inset-y-1 w-px bg-surface/70"
            style={{ left: `${(((i + 1) * MILESTONE) / goalHours) * 100}%` }}
          />
        ))}
      </div>

      {dday && <div className="mt-4">{dday}</div>}
      {editable && <GoalEditor goalHours={goalHours} />}
    </Card>
  );
}
