import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/dates";

// 실습 일지·일정 DB 처리. 모든 함수는 userId를 첫 인자로 받고, 그 사용자 것만 읽고 바꾼다.
// userId는 반드시 서버에서 확인한 로그인 사용자(getCurrentUser)의 id여야 한다.

export const LOG_PAGE_SIZE = 20;

export type LogItem = {
  id: string;
  date: string;
  hospital: string;
  ward: string;
  hours: number;
  activities: string;
};

export type ScheduleItem = {
  id: string;
  hospital: string;
  ward: string;
  startDate: string;
};

type LogInput = { date: string; hospital: string; ward: string; hours: number; activities: string };
type ScheduleInput = { hospital: string; ward: string; startDate: string };

const logSelect = { id: true, date: true, hospital: true, ward: true, minutes: true, activities: true } as const;

function toLogItem(row: { id: string; date: Date; hospital: string; ward: string; minutes: number; activities: string }): LogItem {
  return { id: row.id, date: fromDbDate(row.date), hospital: row.hospital, ward: row.ward, hours: row.minutes / 60, activities: row.activities };
}

function toLogData(input: LogInput) {
  return {
    date: toDbDate(input.date),
    hospital: input.hospital,
    ward: input.ward,
    minutes: Math.round(input.hours * 60),
    activities: input.activities,
  };
}

/**
 * 누적 실습 시간과 목표. 일지를 하나씩 불러오지 않고 DB에서 합계만 계산한다.
 * logsVersion은 일지가 추가·수정·삭제될 때마다 바뀌는 값 (더 불러온 목록을 새로 시작할 때 씀)
 */
export async function getProgress(userId: string) {
  const [agg, profile] = await Promise.all([
    db.practiceLog.aggregate({ where: { userId }, _sum: { minutes: true }, _count: true, _max: { updatedAt: true } }),
    db.profile.findUniqueOrThrow({ where: { id: userId }, select: { goalHours: true } }),
  ]);
  return {
    totalMinutes: agg._sum.minutes ?? 0,
    goalHours: profile.goalHours,
    logsVersion: `${agg._count}-${agg._max.updatedAt?.getTime() ?? 0}`,
  };
}

/** 최신 날짜순 20개씩. cursor는 직전 페이지 마지막 일지 id */
export async function listLogs(userId: string, cursor?: string) {
  const rows = await db.practiceLog.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: LOG_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: logSelect,
  });
  const hasMore = rows.length > LOG_PAGE_SIZE;
  const items = rows.slice(0, LOG_PAGE_SIZE).map(toLogItem);
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function createLog(userId: string, input: LogInput) {
  await db.practiceLog.create({ data: { userId, ...toLogData(input) } });
}

/** 내 일지가 아니면 0건이 바뀌고 false */
export async function updateLog(userId: string, id: string, input: LogInput) {
  const { count } = await db.practiceLog.updateMany({ where: { id, userId }, data: toLogData(input) });
  return count === 1;
}

export async function deleteLog(userId: string, id: string) {
  const { count } = await db.practiceLog.deleteMany({ where: { id, userId } });
  return count === 1;
}

/** 오늘 이후 일정, 가까운 순 */
export async function listUpcomingSchedules(userId: string, today: string): Promise<ScheduleItem[]> {
  const rows = await db.practiceSchedule.findMany({
    where: { userId, startDate: { gte: toDbDate(today) } },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    take: 10,
    select: { id: true, hospital: true, ward: true, startDate: true },
  });
  return rows.map((r) => ({ id: r.id, hospital: r.hospital, ward: r.ward, startDate: fromDbDate(r.startDate) }));
}

export async function createSchedule(userId: string, input: ScheduleInput) {
  await db.practiceSchedule.create({ data: { userId, ...input, startDate: toDbDate(input.startDate) } });
}

export async function updateSchedule(userId: string, id: string, input: ScheduleInput) {
  const { count } = await db.practiceSchedule.updateMany({
    where: { id, userId },
    data: { ...input, startDate: toDbDate(input.startDate) },
  });
  return count === 1;
}

export async function deleteSchedule(userId: string, id: string) {
  const { count } = await db.practiceSchedule.deleteMany({ where: { id, userId } });
  return count === 1;
}

export async function updateGoal(userId: string, goalHours: number) {
  await db.profile.update({ where: { id: userId }, data: { goalHours } });
}
