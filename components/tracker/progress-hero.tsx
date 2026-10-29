import type { ReactNode } from "react";
import NurseTurtle, { turtleStage } from "@/components/mascot/nurse-turtle";
import Card from "@/components/ui/card";
import MilestoneConfetti from "@/components/ui/confetti";
import GoalEditor from "@/components/tracker/goal-editor";
import { DUTY_HOURS } from "@/lib/subjects";
import AnimatedNumber from "@/components/motion/animated-number";
import ProgressBar from "@/components/motion/progress-bar";

const MILESTONE = 100;

// 히어로 카드: 거북이 + "312 / 1,000시간" 큰 숫자 + 두꺼운 진행 바 + 100시간마다 마일스톤 점 + (아래) D-Day 칩
// 숫자는 0에서 굴러 올라가고, 막대는 스프링으로 차오른다
export default function ProgressHero({
  totalMinutes,
  approvedMinutes,
  pendingMinutes,
  goalHours,
  dday,
  editable = true,
}: {
  totalMinutes: number;
  /** 지도교수 인증 완료 시간(분). 없으면(예시 화면) 표시하지 않는다 */
  approvedMinutes?: number;
  /** 교수 인증을 기다리는 시간(분) */
  pendingMinutes?: number;
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
          <p className="text-body-sm font-bold text-ink-soft">
            누적 실습 시간 · <AnimatedNumber value={percent} suffix="%" />
          </p>
          <p className="mt-1 font-display leading-none whitespace-nowrap">
            <AnimatedNumber value={hours} className="text-display text-ink" />
            <span className="text-title text-ink-soft"> / {goalHours.toLocaleString("ko-KR")}시간</span>
          </p>
          <p className="mt-2 text-body-sm text-ink-soft">
            {remaining > 0 ? (
              <>
                졸업 기준까지 <AnimatedNumber value={remaining} suffix="시간" className="font-bold text-ink" /> (약{" "}
                <AnimatedNumber value={Math.ceil(remaining / DUTY_HOURS)} suffix="일" /> 듀티) 남음
              </>
            ) : (
              "졸업 기준 달성"
            )}
          </p>
          {approvedMinutes !== undefined && (
            <p className="mt-0.5 text-body-sm text-ink-soft">
              교수 인증 완료 <AnimatedNumber value={approvedMinutes / 60} suffix="시간" className="font-bold text-brand-deep" />
              {pendingMinutes !== undefined && pendingMinutes > 0 && (
                <>
                  {" "}
                  · 인증 대기 <AnimatedNumber value={pendingMinutes / 60} suffix="시간" className="font-bold text-warn-ink" />
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* 두꺼운 둥근 진행 바 + 100시간마다 얇은 눈금선(마일스톤) */}
      <ProgressBar
        percent={percent}
        minPercent={hours > 0 ? 3 : 0}
        label={`실습 시간 진행률, 100시간 마일스톤 ${milestones}개 중 ${earned}개 달성`}
        className="relative mt-5 h-4 overflow-hidden rounded-full bg-subtle"
        barClassName="h-full rounded-full bg-brand"
      >
        {Array.from({ length: milestones - 1 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute inset-y-1 w-px bg-surface/70"
            style={{ left: `${(((i + 1) * MILESTONE) / goalHours) * 100}%` }}
          />
        ))}
      </ProgressBar>

      {dday && <div className="mt-4">{dday}</div>}
      {editable && <GoalEditor goalHours={goalHours} />}
    </Card>
  );
}
