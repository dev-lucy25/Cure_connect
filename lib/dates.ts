// 날짜는 "YYYY-MM-DD" 문자열로 다루고, DB(@db.Date)에는 UTC 자정으로 저장한다.
// "오늘"은 한국 시간 기준이다.

const KST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });

export function todayKst(): string {
  return KST_DATE.format(new Date());
}

export function toDbDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** to - from (일). D-day 계산용 */
export function daysBetween(from: string, to: string): number {
  return Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / 86_400_000);
}

export const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** "10/29 (수)" */
export function shortDate(isoDate: string): string {
  const d = toDbDate(isoDate);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${WEEKDAY[d.getUTCDay()]})`;
}

export function dDayLabel(days: number): string {
  if (days === 0) return "D-DAY";
  return days > 0 ? `D-${days}` : `D+${-days}`;
}

/** start부터 주말(토·일)을 건너뛰고 평일 count일 ("1주 일괄 기록"용) */
export function weekdaysFrom(start: string, count: number): string[] {
  const result: string[] = [];
  const d = toDbDate(start);
  while (result.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) result.push(fromDbDate(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return result;
}
