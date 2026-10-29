import type { Subject } from "@/generated/prisma/client";
import { SUBJECTS } from "@/lib/subjects";
import Card from "@/components/ui/card";
import AnimatedNumber from "@/components/motion/animated-number";
import ProgressBar from "@/components/motion/progress-bar";

// 전공 영역별 이수 현황: 6과목 × (현재 / 기준 시간, %, 막대). 모바일 1열, sm 이상 2열
export default function SubjectBreakdown({ minutes }: { minutes: Record<Subject, number> }) {
  return (
    <Card>
      <h2 className="text-title font-bold text-ink">전공 영역별 이수 현황</h2>
      <p className="mt-0.5 text-body-sm text-ink-soft">간호교육인증평가 영역별 기준 시간</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {SUBJECTS.map((s) => {
          const hours = minutes[s.key] / 60;
          const percent = Math.min(100, Math.round((hours / s.target) * 100));
          return (
            <li key={s.key} className="rounded-control bg-subtle p-3">
              <div className="flex items-baseline justify-between gap-2 text-body-sm">
                <span className="font-bold text-ink">{s.label}</span>
                <span className="whitespace-nowrap text-ink-soft">
                  <AnimatedNumber value={hours} /> / {s.target}h (<AnimatedNumber value={percent} suffix="%" />)
                </span>
              </div>
              <ProgressBar
                percent={percent}
                label={`${s.label} 이수율`}
                className="mt-2 h-2 overflow-hidden rounded-full bg-surface"
                barClassName={`h-full rounded-full ${percent >= 100 ? "bg-pink" : "bg-brand"}`}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
