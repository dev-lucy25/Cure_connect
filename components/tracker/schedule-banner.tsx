import { dDayLabel, daysBetween, shortDate } from "@/lib/dates";
import type { ScheduleItem } from "@/server/practice-repo";
import { IconCalendar } from "@/components/ui/icons";

// 가장 가까운 다음 실습 → "내과병동 실습 D-5"
export default function ScheduleBanner({ next, today }: { next: ScheduleItem | undefined; today: string }) {
  if (!next) {
    return (
      <section className="flex items-center gap-3 rounded-card border border-dashed border-line px-5 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream-deep text-ink-soft">
          <IconCalendar size={20} />
        </span>
        <div>
          <p className="font-bold">다음 실습이 아직 없어요</p>
          <p className="text-body-sm text-ink-soft">아래 실습 일정에 넣으면 D-day를 세어 드려요</p>
        </div>
      </section>
    );
  }

  const days = daysBetween(today, next.startDate);
  return (
    <section aria-label="다음 실습" className="flex items-center gap-4 rounded-card bg-mint-soft px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-caption font-bold text-mint-deep">다음 실습</p>
        <p className="mt-0.5 truncate text-title font-bold text-ink">{next.ward} 실습</p>
        <p className="truncate text-body-sm text-ink-soft">
          {next.hospital} · {shortDate(next.startDate)} 시작
        </p>
      </div>
      <p className="shrink-0 font-display text-headline text-mint-deep">{dDayLabel(days)}</p>
    </section>
  );
}
