import { dDayLabel, daysBetween, shortDate } from "@/lib/dates";
import type { ScheduleItem } from "@/server/practice-repo";
import Chip from "@/components/ui/chip";
import { IconCalendar } from "@/components/ui/icons";

// 가장 가까운 다음 실습 → "내과병동 실습 D-5" 칩. 다음 실습이 없고 진행 중인 로테이션만 있으면 "진행 중"
export default function DDayChip({
  next,
  current,
  academic,
  today,
}: {
  next: ScheduleItem | undefined;
  current?: ScheduleItem;
  /** 가장 가까운 학사 일정(발표·시험) — 있으면 옆에 따로 */
  academic?: ScheduleItem;
  today: string;
}) {
  const academicChip = academic && (
    <Chip tone="pink">
      📚 {academic.ward} <span className="font-display text-title leading-none">{dDayLabel(daysBetween(today, academic.startDate))}</span>
    </Chip>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PracticeChip next={next} current={current} today={today} />
      {academicChip}
    </div>
  );
}

function PracticeChip({ next, current, today }: { next: ScheduleItem | undefined; current?: ScheduleItem; today: string }) {
  if (!next && current) {
    return (
      <Chip>
        <IconCalendar size={16} /> {current.ward} 실습 진행 중 · {1 - daysBetween(today, current.startDate)}일차
      </Chip>
    );
  }
  if (!next) {
    return (
      <Chip tone="neutral">
        <IconCalendar size={16} /> 등록된 다음 실습이 없어요
      </Chip>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip>
        <IconCalendar size={16} /> {next.ward} 실습 <span className="font-display text-title leading-none">{dDayLabel(daysBetween(today, next.startDate))}</span>
      </Chip>
      <span className="text-body-sm text-ink-soft">
        {next.hospital} · {shortDate(next.startDate)}
      </span>
    </div>
  );
}
