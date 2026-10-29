import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/dates";
import type { LogStatus, Shift, Subject, WardCategory } from "@/generated/prisma/client";

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
  difficulty: number | null;
  hardSkills: string[];
  wardCategory: string | null;
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

type LogInput = {
  date: string;
  subject: Subject;
  shift: Shift | null;
  hospital: string;
  ward: string;
  hours: number;
  activities: string;
  difficulty: number | null;
  hardSkills: string[];
  wardCategory: WardCategory | null;
};

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
  difficulty: true,
  hardSkills: true,
  wardCategory: true,
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
    difficulty: input.difficulty,
    hardSkills: input.hardSkills,
    wardCategory: input.wardCategory,
  };
}

const DAY_MINUTES = 24 * 60;
type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** 그날 이미 기록한 분 (exceptId 일지는 빼고) */
async function dayMinutes(tx: Tx, userId: string, date: string, exceptId?: string) {
  const agg = await tx.practiceLog.aggregate({
    where: { userId, date: toDbDate(date), ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    _sum: { minutes: true },
  });
  return agg._sum.minutes ?? 0;
}

export type LogWriteResult = { status: "saved" } | { status: "over_day"; date: string; left: number } | { status: "not_found" | "locked" };

/**
 * 누적 실습 시간과 목표. 일지를 하나씩 불러오지 않고 DB에서 합계만 계산한다.
 * logsVersion은 일지가 추가·수정·삭제될 때마다 바뀌는 값 (더 불러온 목록을 새로 시작할 때 씀)
 */
export async function getProgress(userId: string) {
  const [agg, approved, pending, profile] = await Promise.all([
    db.practiceLog.aggregate({ where: { userId }, _sum: { minutes: true }, _count: true, _max: { updatedAt: true } }),
    db.practiceLog.aggregate({ where: { userId, status: "approved" }, _sum: { minutes: true } }),
    db.practiceLog.aggregate({ where: { userId, status: "pending" }, _sum: { minutes: true } }),
    db.profile.findUniqueOrThrow({ where: { id: userId }, select: { goalHours: true } }),
  ]);
  return {
    totalMinutes: agg._sum.minutes ?? 0,
    // 누적은 전체 기준, 지도교수가 인증한 시간은 따로 보여 준다
    approvedMinutes: approved._sum.minutes ?? 0,
    pendingMinutes: pending._sum.minutes ?? 0,
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

/** 같은 사용자 저장이 동시에 와도 하루 합계를 한 번에 하나씩 확인한다 */
const lockUser = (tx: Tx, userId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`logs:${userId}`}))`;

/** 일지 한 건. 그날 합계가 24시간을 넘으면 저장하지 않는다 */
export async function createLog(userId: string, input: LogInput): Promise<LogWriteResult> {
  return db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const used = await dayMinutes(tx, userId, input.date);
    const minutes = Math.round(input.hours * 60);
    if (used + minutes > DAY_MINUTES) return { status: "over_day" as const, date: input.date, left: (DAY_MINUTES - used) / 60 };
    await tx.practiceLog.create({ data: { userId, ...toLogData(input) } });
    return { status: "saved" as const };
  });
}

/** 1주 일괄: 이미 기록이 있는 날은 건너뛰고 나머지만 넣는다 (같은 주를 두 번 눌러도 중복 없음) */
export async function createWeekLogs(userId: string, inputs: LogInput[]) {
  return db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const logged = await tx.practiceLog.findMany({
      where: { userId, date: { in: inputs.map((i) => toDbDate(i.date)) } },
      select: { date: true },
      distinct: ["date"],
    });
    const skip = new Set(logged.map((l) => fromDbDate(l.date)));
    const add = inputs.filter((i) => !skip.has(i.date));
    if (add.length) await tx.practiceLog.createMany({ data: add.map((input) => ({ userId, ...toLogData(input) })) });
    return { added: add.length, skipped: inputs.length - add.length };
  });
}

/**
 * 내 일지만 고친다. 지도교수가 인증한 일지는 잠겨서 못 고친다(locked).
 * 고치면 인증을 다시 받아야 하므로 대기 상태로 돌린다. 하루 합계 24시간 검사는 이 일지를 뺀 나머지 기준
 */
export async function updateLog(userId: string, id: string, input: LogInput): Promise<LogWriteResult> {
  return db.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const found = await tx.practiceLog.findFirst({ where: { id, userId }, select: { status: true } });
    if (!found) return { status: "not_found" as const };
    if (found.status === "approved") return { status: "locked" as const };
    const used = await dayMinutes(tx, userId, input.date, id);
    const minutes = Math.round(input.hours * 60);
    if (used + minutes > DAY_MINUTES) return { status: "over_day" as const, date: input.date, left: (DAY_MINUTES - used) / 60 };
    await tx.practiceLog.update({ where: { id }, data: { ...toLogData(input), status: "pending", reviewedBy: null, reviewedAt: null } });
    return { status: "saved" as const };
  });
}

/** 인증된 일지는 지울 수 없다 (인증 시간이 말없이 줄어드는 것을 막음) */
export async function deleteLog(userId: string, id: string): Promise<"deleted" | "not_found" | "locked"> {
  const found = await db.practiceLog.findFirst({ where: { id, userId }, select: { status: true } });
  if (!found) return "not_found";
  if (found.status === "approved") return "locked";
  const { count } = await db.practiceLog.deleteMany({ where: { id, userId, status: { not: "approved" } } });
  return count === 1 ? "deleted" : "locked";
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

/** 끝난 일정 최근 10개 (끝난 뒤에도 고치거나 지울 수 있게) */
export async function listPastSchedules(userId: string, today: string): Promise<ScheduleItem[]> {
  const day = toDbDate(today);
  const rows = await db.practiceSchedule.findMany({
    where: { userId, OR: [{ endDate: { lt: day } }, { endDate: null, startDate: { lt: day } }] },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
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
