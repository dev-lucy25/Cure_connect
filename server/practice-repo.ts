import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/dates";
import type { LogStatus, Shift, Subject } from "@/generated/prisma/client";

// 실습 일지·일정 DB 처리. 모든 함수는 userId를 첫 인자로 받고, 그 사용자 것만 읽고 바꾼다.
// userId는 반드시 서버에서 확인한 로그인 사용자(getCurrentUser)의 id여야 한다.

export const LOG_PAGE_SIZE = 20;

export type LogItem = {
  id: string;
  date: string;
  subject: Subject;
  shift: Shift | null;
  status: LogStatus;
  hospital: string;
  ward: string;
  hours: number;
  activities: string;
};

export type ScheduleItem = {
  id: string;
  subject: Subject | null;
  hospital: string;
  ward: string;
  department: string | null;
  startDate: string;
  endDate: string | null;
  shift: Shift | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  meetingPlace: string | null;
  meetingTime: string | null;
  preceptor: string | null;
  commonDiseases: string[];
  groupName: string | null;
  teammates: string[];
};

type ScheduleInput = Omit<ScheduleItem, "id">;

type LogInput = { date: string; subject: Subject; shift: Shift | null; hospital: string; ward: string; hours: number; activities: string };

const logSelect = {
  id: true,
  date: true,
  subject: true,
  shift: true,
  status: true,
  hospital: true,
  ward: true,
  minutes: true,
  activities: true,
} as const;

type LogRow = Omit<LogItem, "date" | "hours"> & { date: Date; minutes: number };

function toLogItem({ date, minutes, ...rest }: LogRow): LogItem {
  return { ...rest, date: fromDbDate(date), hours: minutes / 60 };
}

function toLogData(input: LogInput) {
  return {
    date: toDbDate(input.date),
    subject: input.subject,
    shift: input.shift,
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

/** 과목별 누적 분. 일지에 없는 과목은 0 */
export async function getSubjectMinutes(userId: string): Promise<Record<Subject, number>> {
  const rows = await db.practiceLog.groupBy({ by: ["subject"], where: { userId }, _sum: { minutes: true } });
  const result = { adult: 0, maternal: 0, child: 0, community: 0, psych: 0, management: 0 } satisfies Record<Subject, number>;
  for (const row of rows) result[row.subject] = row._sum.minutes ?? 0;
  return result;
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

/** 여러 날 일지를 한 번에 (1주 일괄). 전부 들어가거나 하나도 안 들어간다 */
export async function createLogs(userId: string, inputs: LogInput[]) {
  await db.practiceLog.createMany({ data: inputs.map((input) => ({ userId, ...toLogData(input) })) });
}

/** 내 일지가 아니면 0건이 바뀌고 false. 고치면 지도교수 인증을 다시 받아야 하므로 대기 상태로 돌린다 */
export async function updateLog(userId: string, id: string, input: LogInput) {
  const { count } = await db.practiceLog.updateMany({
    where: { id, userId },
    data: { ...toLogData(input), status: "pending", reviewedBy: null, reviewedAt: null },
  });
  return count === 1;
}

export async function deleteLog(userId: string, id: string) {
  const { count } = await db.practiceLog.deleteMany({ where: { id, userId } });
  return count === 1;
}

const scheduleSelect = {
  id: true,
  subject: true,
  hospital: true,
  ward: true,
  department: true,
  startDate: true,
  endDate: true,
  shift: true,
  shiftStart: true,
  shiftEnd: true,
  meetingPlace: true,
  meetingTime: true,
  preceptor: true,
  commonDiseases: true,
  groupName: true,
  teammates: true,
} as const;

type ScheduleRow = Omit<ScheduleItem, "startDate" | "endDate"> & { startDate: Date; endDate: Date | null };

function toScheduleItem({ startDate, endDate, ...rest }: ScheduleRow): ScheduleItem {
  return { ...rest, startDate: fromDbDate(startDate), endDate: endDate ? fromDbDate(endDate) : null };
}

function toScheduleData({ startDate, endDate, ...rest }: ScheduleInput) {
  return { ...rest, startDate: toDbDate(startDate), endDate: endDate ? toDbDate(endDate) : null };
}

/** 진행 중이거나 앞으로 있을 일정, 시작일 가까운 순 (종료일이 없으면 시작일이 오늘 이후인 것만) */
export async function listUpcomingSchedules(userId: string, today: string): Promise<ScheduleItem[]> {
  const day = toDbDate(today);
  const rows = await db.practiceSchedule.findMany({
    where: { userId, OR: [{ endDate: { gte: day } }, { endDate: null, startDate: { gte: day } }] },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    take: 10,
    select: scheduleSelect,
  });
  return rows.map(toScheduleItem);
}

export async function createSchedule(userId: string, input: ScheduleInput) {
  await db.practiceSchedule.create({ data: { userId, ...toScheduleData(input) } });
}

export async function updateSchedule(userId: string, id: string, input: ScheduleInput) {
  const { count } = await db.practiceSchedule.updateMany({ where: { id, userId }, data: toScheduleData(input) });
  return count === 1;
}

export async function deleteSchedule(userId: string, id: string) {
  const { count } = await db.practiceSchedule.deleteMany({ where: { id, userId } });
  return count === 1;
}

export async function updateGoal(userId: string, goalHours: number) {
  await db.profile.update({ where: { id: userId }, data: { goalHours } });
}
