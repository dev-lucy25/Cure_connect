import { dDayLabel, daysBetween, shortDate } from "@/lib/dates";
import type { ScheduleItem } from "@/server/practice-repo";
import Chip from "@/components/ui/chip";
import { IconCalendar } from "@/components/ui/icons";

// 가장 가까운 다음 실습 → "내과병동 실습 D-5" 칩
export default function DDayChip({ next, today }: { next: ScheduleItem | undefined; today: string }) {
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
