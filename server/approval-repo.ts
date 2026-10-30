import "server-only";
import { db } from "@/lib/db";
import { fromDbDate } from "@/lib/dates";
import { visibleStudents, type Prof } from "@/server/professor-repo";
import { notify } from "@/server/notification-repo";
import type { LogStatus, Shift, Subject } from "@/generated/prisma/client";

// 교수의 실습 일지 인증. 볼 수 있는 학생(같은 학교·같은 방)의 일지만, 인증 대기 상태일 때만 바꾼다.
// 인증된 일지는 학생이 고치거나 지울 수 없다 (practice-repo의 잠금).

export type ReviewLog = {
  id: string;
  studentId: string;
  studentName: string;
  memberNo: string | null;
  date: string;
  subject: Subject;
  shift: Shift | null;
  hospital: string;
  ward: string;
  hours: number;
  activities: string;
  status: LogStatus;
};

const logSelect = {
  id: true,
  userId: true,
  date: true,
  subject: true,
  shift: true,
  hospital: true,
  ward: true,
  minutes: true,
  activities: true,
  status: true,
  user: { select: { name: true, memberNo: true } },
} as const;

type Row = {
  id: string;
  userId: string;
  date: Date;
  subject: Subject;
  shift: Shift | null;
  hospital: string;
  ward: string;
  minutes: number;
  activities: string;
  status: LogStatus;
  user: { name: string; memberNo: string | null };
};

const toReviewLog = (r: Row): ReviewLog => ({
  id: r.id,
  studentId: r.userId,
  studentName: r.user.name,
  memberNo: r.user.memberNo,
  date: fromDbDate(r.date),
  subject: r.subject,
  shift: r.shift,
  hospital: r.hospital,
  ward: r.ward,
  hours: r.minutes / 60,
  activities: r.activities,
  status: r.status,
});

/** 인증 대기함: 볼 수 있는 학생의 대기 일지 (오래된 날짜부터, 최대 200건) */
export async function listPendingLogs(prof: Prof): Promise<ReviewLog[]> {
  const rows = await db.practiceLog.findMany({
    where: { status: "pending", user: visibleStudents(prof) },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: 200,
    select: logSelect,
  });
  return rows.map(toReviewLog);
}

export async function countPendingLogs(prof: Prof) {
  return db.practiceLog.count({
    where: { status: "pending", user: visibleStudents(prof) },
  });
}

/**
 * 일지 인증·반려. 볼 수 있는 학생의 "대기" 일지만 바뀐다(이미 처리된 것은 건너뜀).
 * 학생마다 알림 1개(몇 건 인증/반려됐는지, 반려 사유)를 같은 트랜잭션으로 보낸다.
 */
export async function reviewLogs(
  prof: Prof & { name: string },
  ids: string[],
  decision: "approved" | "rejected",
  reason: string,
): Promise<number> {
  return db.$transaction(async (tx) => {
    const targets = await tx.practiceLog.findMany({
      where: {
        id: { in: ids },
        status: "pending",
        user: visibleStudents(prof),
      },
      select: { id: true, userId: true, minutes: true },
    });
    if (targets.length === 0) return 0;
    await tx.practiceLog.updateMany({
      where: { id: { in: targets.map((t) => t.id) }, status: "pending" },
      data: { status: decision, reviewedBy: prof.id, reviewedAt: new Date() },
    });
    const byStudent = new Map<string, { count: number; minutes: number }>();
    for (const t of targets) {
      const cur = byStudent.get(t.userId) ?? { count: 0, minutes: 0 };
      byStudent.set(t.userId, {
        count: cur.count + 1,
        minutes: cur.minutes + t.minutes,
      });
    }
    await notify(
      [...byStudent].map(([userId, { count, minutes }]) =>
        decision === "approved"
          ? {
              userId,
              kind: "log_approved",
              title: `실습 일지 ${count}건 인증 완료`,
              body: `${prof.name} 교수님이 ${Math.round((minutes / 60) * 10) / 10}시간을 인증했어요.`,
              link: "/",
            }
          : {
              userId,
              kind: "log_rejected",
              title: `실습 일지 ${count}건 반려`,
              body: `${prof.name} 교수님${reason ? `: ${reason}` : "이 일지를 반려했어요. 내용을 확인해 고쳐 주세요."}`,
              link: "/",
            },
      ),
      tx,
    );
    return targets.length;
  });
}

export type StudentDetail = {
  id: string;
  name: string;
  memberNo: string | null;
  classLabel: string;
  orgName: string | null;
  roomCode: string | null;
  totalMinutes: number;
  approvedMinutes: number;
  pendingMinutes: number;
  subjectMinutes: Record<Subject, number>;
  logs: ReviewLog[];
};

/** 학생 상세 (볼 수 없는 학생이면 null): 시간 요약·과목별·최근 일지 50개 */
export async function getStudentDetail(
  prof: Prof,
  studentId: string,
): Promise<StudentDetail | null> {
  const student = await db.profile.findFirst({
    where: { AND: [visibleStudents(prof), { id: studentId }] },
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
  if (!student) return null;
  const [byStatus, bySubject, logs] = await Promise.all([
    db.practiceLog.groupBy({
      by: ["status"],
      where: { userId: studentId },
      _sum: { minutes: true },
    }),
    db.practiceLog.groupBy({
      by: ["subject"],
      where: { userId: studentId },
      _sum: { minutes: true },
    }),
    db.practiceLog.findMany({
      where: { userId: studentId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 50,
      select: logSelect,
    }),
  ]);
  const sum = (s?: LogStatus) =>
    byStatus
      .filter((r) => !s || r.status === s)
      .reduce((a, r) => a + (r._sum.minutes ?? 0), 0);
  const subjectMinutes = {
    adult: 0,
    maternal: 0,
    child: 0,
    community: 0,
    psych: 0,
    management: 0,
  } satisfies Record<Subject, number>;
  for (const row of bySubject)
    subjectMinutes[row.subject] = row._sum.minutes ?? 0;
  return {
    id: student.id,
    name: student.name,
    memberNo: student.memberNo,
    classLabel: [
      student.grade && `${student.grade}학년`,
      student.classGroup && `${student.classGroup}반`,
    ]
      .filter(Boolean)
      .join(" "),
    orgName: student.org?.name ?? null,
    roomCode: student.roomCode,
    totalMinutes: sum(),
    approvedMinutes: sum("approved"),
    pendingMinutes: sum("pending"),
    subjectMinutes,
    logs: logs.map(toReviewLog),
  };
}
