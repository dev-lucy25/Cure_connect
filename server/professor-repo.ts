import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/server/auth";
import { notifiedToday, notify } from "@/server/notification-repo";
import { fromDbDate, nextDay, todayKst, toDbDate, weekdaysBetween } from "@/lib/dates";
import { DUTY_HOURS } from "@/lib/subjects";
import { GRADUATION_HOURS, STATUS_TEXT, graduationPercent, practiceStatus, type PracticeStatus } from "@/lib/practice-status";

// 교수 대시보드 DB 처리. 교수는 "같은 학교 또는 자기 방 코드"의 학생만 볼 수 있다(다른 학생은 존재도 모름).
// prof는 반드시 서버에서 확인한 교수 계정이어야 한다.
// 상태·달성률은 졸업 기준 1,000시간 고정(학생 개인 목표와 무관) — lib/practice-status.ts

export type Prof = Pick<CurrentUser, "id" | "orgId" | "roomCode">;
export type RosterFilter = "ALL" | "ROOM" | "RISK" | "SHORT";

export type RosterRow = {
  id: string;
  name: string;
  memberNo: string | null;
  classLabel: string;
  orgName: string | null;
  roomCode: string | null;
  sameRoom: boolean;
  place: string | null;
  hours: number;
  approvedHours: number;
  percent: number;
  status: PracticeStatus;
  /** 앞으로 잡힌 실습 일정을 다 해도 1,000시간에 모자라는 시간 (0이면 문제없음) → 보충실습 검토 대상 */
  shortfall: number;
  /** 오늘 이미 독려 알림을 받았는가 (학생당 하루 1번) */
  nudgedToday: boolean;
};

/** 이 교수가 볼 수 있는 학생 조건. 학교도 방 코드도 없으면 아무도 안 보인다 */
export function visibleStudents(prof: Prof): Prisma.ProfileWhereInput {
  const or: Prisma.ProfileWhereInput[] = [];
  if (prof.orgId) or.push({ orgId: prof.orgId });
  if (prof.roomCode) or.push({ roomCode: prof.roomCode });
  return or.length ? { role: "student", OR: or } : { id: { in: [] } };
}

export async function canSeeStudent(prof: Prof, studentId: string) {
  return (await db.profile.count({ where: { AND: [visibleStudents(prof), { id: studentId }] } })) === 1;
}

/** 내일부터 잡힌 일정의 예정 실습 시간 (평일 × 8시간). 종료일이 없으면 시작일 하루 */
async function plannedHours(ids: string[], today: string) {
  const tomorrow = nextDay(today);
  const schedules = await db.practiceSchedule.findMany({
    where: { userId: { in: ids }, OR: [{ startDate: { gte: toDbDate(tomorrow) } }, { endDate: { gte: toDbDate(tomorrow) } }] },
    select: { userId: true, startDate: true, endDate: true },
  });
  const planned = new Map<string, number>();
  for (const s of schedules) {
    const start = fromDbDate(s.startDate) > tomorrow ? fromDbDate(s.startDate) : tomorrow;
    const end = s.endDate ? fromDbDate(s.endDate) : fromDbDate(s.startDate);
    planned.set(s.userId, (planned.get(s.userId) ?? 0) + weekdaysBetween(start, end) * DUTY_HOURS);
  }
  return planned;
}

/** 학생 현황판: 누적·인증 시간, 현재 실습지(가장 최근 일지), 상태, 보충실습 검토 */
export async function listRoster(prof: Prof, filter: RosterFilter = "ALL"): Promise<RosterRow[]> {
  const students = await db.profile.findMany({
    where: visibleStudents(prof),
    orderBy: [{ grade: "desc" }, { classGroup: "asc" }, { memberNo: "asc" }, { name: "asc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      memberNo: true,
      grade: true,
      classGroup: true,
      roomCode: true,
      org: { select: { name: true } },
    },
  });
  const ids = students.map((s) => s.id);
  const [totals, approved, latest, nudged, planned] = ids.length
    ? await Promise.all([
        db.practiceLog.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _sum: { minutes: true } }),
        db.practiceLog.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "approved" }, _sum: { minutes: true } }),
        db.practiceLog.findMany({
          where: { userId: { in: ids } },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          distinct: ["userId"],
          select: { userId: true, hospital: true, ward: true },
        }),
        notifiedToday(db, ids, NUDGE_KIND),
        plannedHours(ids, todayKst()),
      ])
    : [[], [], [], new Set<string>(), new Map<string, number>()];
  const minutesOf = (rows: { userId: string; _sum: { minutes: number | null } }[], id: string) =>
    rows.find((r) => r.userId === id)?._sum.minutes ?? 0;
  const placeOf = new Map(latest.map((l) => [l.userId, `${l.hospital} ${l.ward}`]));

  const rows: RosterRow[] = students.map((s) => {
    const hours = minutesOf(totals, s.id) / 60;
    const status = practiceStatus(hours);
    // 아직 실습을 시작하지 않은 학생은 일정이 없을 수 있어 보충 검토에서 뺀다
    const shortfall = status === "DONE" || status === "START" ? 0 : Math.max(0, GRADUATION_HOURS - hours - (planned.get(s.id) ?? 0));
    return {
      id: s.id,
      name: s.name,
      memberNo: s.memberNo,
      classLabel: [s.grade && `${s.grade}학년`, s.classGroup && `${s.classGroup}반`].filter(Boolean).join(" "),
      orgName: s.org?.name ?? null,
      roomCode: s.roomCode,
      sameRoom: Boolean(prof.roomCode && s.roomCode === prof.roomCode),
      place: placeOf.get(s.id) ?? null,
      hours,
      approvedHours: minutesOf(approved, s.id) / 60,
      percent: graduationPercent(hours),
      status,
      shortfall: Math.ceil(shortfall),
      nudgedToday: nudged.has(s.id),
    };
  });
  if (filter === "ROOM") return rows.filter((r) => r.sameRoom);
  if (filter === "RISK") return rows.filter((r) => r.status === "RISK");
  if (filter === "SHORT") return rows.filter((r) => r.shortfall > 0);
  return rows;
}

export type Kpis = { matched: number; done: number; avgPercent: number; risk: number; short: number; pendingSubmissions: number };

export async function professorKpis(prof: Prof, roster?: RosterRow[]): Promise<Kpis> {
  const rows = roster ?? (await listRoster(prof, "ALL"));
  const pendingSubmissions = rows.length
    ? await db.caseSubmission.count({ where: { status: "submitted", studentId: { in: rows.map((r) => r.id) } } })
    : 0;
  return {
    matched: rows.length,
    done: rows.filter((r) => r.status === "DONE").length,
    avgPercent: rows.length ? Math.round((rows.reduce((a, r) => a + r.percent, 0) / rows.length) * 10) / 10 : 0,
    risk: rows.filter((r) => r.status === "RISK").length,
    short: rows.filter((r) => r.shortfall > 0).length,
    pendingSubmissions,
  };
}

export const NUDGE_KIND = "nudge";
export type NudgeResult = { sent: number; skipped: number };

const hoursText = (h: number) => (Math.round(h * 10) / 10).toLocaleString("ko-KR");

/**
 * 독려 알림: 내가 볼 수 있는 학생에게만, 학생당 하루 1번(다른 교수님이 보냈어도 1번).
 * 동시에 눌러도 두 번 가지 않게 잠금 안에서 오늘 받은 학생을 다시 확인한다.
 */
export async function nudgeStudents(prof: Prof & { name: string }, studentIds: string[]): Promise<NudgeResult> {
  const wanted = new Set(studentIds);
  const targets = (await listRoster(prof, "ALL")).filter((r) => wanted.has(r.id));
  if (targets.length === 0) return { sent: 0, skipped: 0 };
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${NUDGE_KIND}))`;
    const done = await notifiedToday(
      tx,
      targets.map((r) => r.id),
      NUDGE_KIND,
    );
    const send = targets.filter((r) => !done.has(r.id));
    await notify(
      send.map((r) => ({
        userId: r.id,
        kind: NUDGE_KIND,
        title: "🐢 실습 시간 확인 독려",
        body: `${prof.name} 교수님: 지금 누적 ${hoursText(r.hours)}시간(${r.percent}%)이에요. 졸업 기준 ${GRADUATION_HOURS.toLocaleString("ko-KR")}시간까지 실습 기록을 꾸준히 남겨 주세요.`,
        link: "/",
      })),
      tx,
    );
    return { sent: send.length, skipped: targets.length - send.length };
  });
}

export type RoomResult = { status: "saved"; movedStudentIds: string[] } | { status: "taken" };

/**
 * 교수 방 코드 바꾸기.
 * - 한 번이라도 다른 사람(교수·학생)이 쓰고 있는 코드는 가져갈 수 없다 → 남의 반 학생이 보이는 일을 막는다
 * - 바꾸면 내 방(옛 코드) 학생들도 새 코드로 함께 옮긴다 → 옛 코드에 남는 학생이 없다
 */
export async function setRoomCode(profId: string, roomCode: string): Promise<RoomResult> {
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`room:${roomCode}`}))`;
      const me = await tx.profile.findUniqueOrThrow({ where: { id: profId }, select: { roomCode: true } });
      if (me.roomCode === roomCode) return { status: "saved" as const, movedStudentIds: [] };
      const inUse = await tx.profile.count({ where: { roomCode, NOT: { id: profId } } });
      if (inUse > 0) return { status: "taken" as const };
      await tx.profile.update({ where: { id: profId }, data: { roomCode }, select: { id: true } });
      if (!me.roomCode) return { status: "saved" as const, movedStudentIds: [] };
      const students = await tx.profile.findMany({ where: { role: "student", roomCode: me.roomCode }, select: { id: true } });
      await tx.profile.updateMany({ where: { role: "student", roomCode: me.roomCode }, data: { roomCode } });
      return { status: "saved" as const, movedStudentIds: students.map((s) => s.id) };
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { status: "taken" };
    throw error;
  }
}

/** 엑셀이 수식으로 읽지 않게(=,+,-,@로 시작하면 ' 붙임), 쉼표·따옴표·줄바꿈은 따옴표로 감싼다 */
export function csvCell(value: string | number | null) {
  let s = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 간호교육인증평가 제출용 실습대장 CSV (UTF-8 BOM, 엑셀에서 한글 깨짐 없음) */
export async function rosterCsv(prof: Prof) {
  const rows = await listRoster(prof, "ALL");
  const header = [
    "학번",
    "이름",
    "소속학교",
    "방코드",
    "학년반",
    "현재실습지",
    "누적실습시간(h)",
    "인증완료시간(h)",
    "기준시간(h)",
    "달성률(%)",
    "이수상태",
    "예정일정 반영 부족시간(h)",
  ];
  const lines = rows.map((r) =>
    [
      r.memberNo,
      r.name,
      r.orgName,
      r.roomCode,
      r.classLabel,
      r.place,
      r.hours,
      r.approvedHours,
      GRADUATION_HOURS,
      r.percent,
      STATUS_TEXT[r.status].csv,
      r.shortfall,
    ]
      .map(csvCell)
      .join(","),
  );
  return "﻿" + [header.join(","), ...lines].join("\r\n");
}
