import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/server/auth";

// 교수 대시보드 DB 처리. 교수는 "같은 학교 또는 자기 방 코드"의 학생만 볼 수 있다(다른 학생은 존재도 모름).
// prof는 반드시 서버에서 확인한 교수 계정이어야 한다.

/** 데모 새 버전 기준: 누적 500시간 미만이면 위험군 */
export const RISK_HOURS = 500;

export type Prof = Pick<CurrentUser, "id" | "orgId" | "roomCode">;
export type RosterFilter = "ALL" | "ROOM" | "RISK";
export type StudentStatus = "DONE" | "RISK" | "NORMAL";

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
  goalHours: number;
  percent: number;
  status: StudentStatus;
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

function statusOf(hours: number, goalHours: number): StudentStatus {
  if (hours >= goalHours) return "DONE";
  if (hours < RISK_HOURS) return "RISK";
  return "NORMAL";
}

/** 학생 현황판: 누적·인증 시간, 현재 실습지(가장 최근 일지), 상태 */
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
      goalHours: true,
      org: { select: { name: true } },
    },
  });
  const ids = students.map((s) => s.id);
  const [totals, approved, latest] = ids.length
    ? await Promise.all([
        db.practiceLog.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _sum: { minutes: true } }),
        db.practiceLog.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "approved" }, _sum: { minutes: true } }),
        db.practiceLog.findMany({
          where: { userId: { in: ids } },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          distinct: ["userId"],
          select: { userId: true, hospital: true, ward: true },
        }),
      ])
    : [[], [], []];
  const minutesOf = (rows: { userId: string; _sum: { minutes: number | null } }[], id: string) =>
    rows.find((r) => r.userId === id)?._sum.minutes ?? 0;
  const placeOf = new Map(latest.map((l) => [l.userId, `${l.hospital} ${l.ward}`]));

  const rows: RosterRow[] = students.map((s) => {
    const hours = minutesOf(totals, s.id) / 60;
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
      goalHours: s.goalHours,
      percent: Math.min(100, Math.round((hours / s.goalHours) * 1000) / 10),
      status: statusOf(hours, s.goalHours),
    };
  });
  if (filter === "ROOM") return rows.filter((r) => r.sameRoom);
  if (filter === "RISK") return rows.filter((r) => r.status === "RISK");
  return rows;
}

export type Kpis = { matched: number; avgPercent: number; risk: number; pendingSubmissions: number };

export async function professorKpis(prof: Prof): Promise<Kpis> {
  const roster = await listRoster(prof, "ALL");
  const pendingSubmissions = roster.length
    ? await db.caseSubmission.count({ where: { status: "submitted", studentId: { in: roster.map((r) => r.id) } } })
    : 0;
  return {
    matched: roster.length,
    avgPercent: roster.length ? Math.round((roster.reduce((a, r) => a + r.percent, 0) / roster.length) * 10) / 10 : 0,
    risk: roster.filter((r) => r.status === "RISK").length,
    pendingSubmissions,
  };
}

export type RoomResult = "saved" | "taken";

/** 교수 방 코드 바꾸기 (다른 교수와 겹치면 taken — DB 부분 고유 인덱스로도 막힘) */
export async function setRoomCode(profId: string, roomCode: string): Promise<RoomResult> {
  const other = await db.profile.findFirst({ where: { roomCode, role: "professor", NOT: { id: profId } }, select: { id: true } });
  if (other) return "taken";
  try {
    await db.profile.update({ where: { id: profId }, data: { roomCode }, select: { id: true } });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return "taken";
    throw error;
  }
  return "saved";
}

/** 엑셀이 수식으로 읽지 않게(=,+,-,@로 시작하면 ' 붙임), 쉼표·따옴표·줄바꿈은 따옴표로 감싼다 */
export function csvCell(value: string | number | null) {
  let s = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUS_LABEL: Record<StudentStatus, string> = { DONE: "이수 완료", RISK: "미달 위험", NORMAL: "정상 이수중" };

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
      r.goalHours,
      r.percent,
      STATUS_LABEL[r.status],
    ]
      .map(csvCell)
      .join(","),
  );
  return "\uFEFF" + [header.join(","), ...lines].join("\r\n");
}
