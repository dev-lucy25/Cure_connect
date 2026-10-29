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

/** from~to(포함) 사이 평일 수. to가 from보다 앞이면 0 (예정 실습 시간 계산용) */
export function weekdaysBetween(from: string, to: string): number {
  let count = 0;
  const d = toDbDate(from);
  const end = toDbDate(to).getTime();
  while (d.getTime() <= end) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

/** 하루 뒤 날짜 */
export function nextDay(isoDate: string): string {
  const d = toDbDate(isoDate);
  d.setUTCDate(d.getUTCDate() + 1);
  return fromDbDate(d);
}

/** "방금 전", "10분 전", "3시간 전", "2일 전", 그보다 오래되면 "10/29 (수)" */
export function timeAgo(iso: string, nowMs: number): string {
  const sec = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "방금 전";
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 7 * 86_400) return `${Math.floor(sec / 86_400)}일 전`;
  return shortDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso)));
}

/** 지금 기준 timeAgo. 서버에서 요청마다 계산해 화면으로 넘길 때 쓴다 */
export function timeAgoFromNow(iso: string): string {
  return timeAgo(iso, Date.now());
}
