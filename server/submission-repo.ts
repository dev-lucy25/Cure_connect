import "server-only";
import { db } from "@/lib/db";
import { storedCaseAiSchema, type CaseAiResult } from "@/lib/validation/case";
import type { Prisma, SubmissionStatus } from "@/generated/prisma/client";
import { visibleStudents, type Prof } from "@/server/professor-repo";
import { notify } from "@/server/notification-repo";
import type { GradeInput } from "@/lib/validation/grading";

// 과제 제출 DB 처리. userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.
// 제출 순간의 메모·AI 결과를 복사해 저장한다 → 이후 케이스를 고치거나 지워도 제출본은 그대로.

export type SubmissionSummary = {
  id: string;
  caseId: string | null;
  title: string;
  ward: string;
  status: SubmissionStatus;
  grade: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
};

const summarySelect = {
  id: true,
  caseId: true,
  title: true,
  ward: true,
  status: true,
  grade: true,
  score: true,
  feedback: true,
  submittedAt: true,
  gradedAt: true,
} as const;

type Row = Omit<SubmissionSummary, "submittedAt" | "gradedAt"> & {
  submittedAt: Date;
  gradedAt: Date | null;
};

function toSummary({ submittedAt, gradedAt, ...rest }: Row): SubmissionSummary {
  return {
    ...rest,
    submittedAt: submittedAt.toISOString(),
    gradedAt: gradedAt?.toISOString() ?? null,
  };
}

export type SubmitResult =
  "submitted" | "no_professor" | "not_found" | "no_ai" | "stale" | "pending";

/** 이 학생을 볼 수 있는 교수 조건 (같은 학교 또는 학생이 들어간 방의 교수) — 교수 쪽 visibleStudents의 반대 방향 */
function professorsOf(student: {
  orgId: string | null;
  roomCode: string | null;
}): Prisma.ProfileWhereInput | null {
  const or: Prisma.ProfileWhereInput[] = [];
  if (student.orgId) or.push({ orgId: student.orgId });
  if (student.roomCode) or.push({ roomCode: student.roomCode });
  return or.length ? { role: "professor", OR: or } : null;
}

/** 내 과제를 받아 볼 교수님 이름 (최대 3명). 없으면 빈 배열 → 제출 대신 연결 안내 */
export async function connectedProfessors(student: {
  orgId: string | null;
  roomCode: string | null;
}) {
  const where = professorsOf(student);
  if (!where) return [];
  const rows = await db.profile.findMany({
    where,
    orderBy: { name: "asc" },
    take: 3,
    select: { name: true },
  });
  return rows.map((r) => r.name);
}

/** 이 케이스의 가장 최근 제출 (없으면 null) */
export async function latestSubmissionForCase(
  userId: string,
  caseId: string,
): Promise<SubmissionSummary | null> {
  const row = await db.caseSubmission.findFirst({
    where: { caseId, studentId: userId },
    orderBy: { submittedAt: "desc" },
    select: summarySelect,
  });
  return row ? toSummary(row) : null;
}

/**
 * 과제 제출. 받아 볼 교수(같은 학교 또는 같은 방)가 있어야 하고, 메모를 바꾼 뒤 다시 정리하지 않은 결과는 낼 수 없다.
 * 같은 케이스에 채점 대기 제출이 이미 있으면 DB 부분 고유 인덱스가 막는다 → "pending" (연타·동시 제출에도 1건)
 */
export async function submitCase(
  userId: string,
  student: { orgId: string | null; roomCode: string | null },
  caseId: string,
): Promise<SubmitResult> {
  if ((await connectedProfessors(student)).length === 0) return "no_professor";
  const orgId = student.orgId;
  const found = await db.caseNote.findFirst({
    where: { id: caseId, userId },
    select: {
      title: true,
      ward: true,
      memo: true,
      aiResult: true,
      aiAt: true,
      memoUpdatedAt: true,
    },
  });
  if (!found) return "not_found";
  if (found.aiResult === null || found.aiAt === null) return "no_ai";
  if (found.memoUpdatedAt > found.aiAt) return "stale";
  const ai = storedCaseAiSchema.safeParse(found.aiResult);
  if (!ai.success) return "no_ai";

  try {
    await db.caseSubmission.create({
      data: {
        caseId,
        studentId: userId,
        orgId,
        title: found.title,
        ward: found.ward,
        memo: found.memo,
        aiResult: ai.data satisfies CaseAiResult,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
      return "pending";
    throw error;
  }
  return "submitted";
}

/** 내 제출 최신순 (최근 50개) */
export async function listMySubmissions(
  userId: string,
): Promise<SubmissionSummary[]> {
  const rows = await db.caseSubmission.findMany({
    where: { studentId: userId },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: summarySelect,
  });
  return rows.map(toSummary);
}

// ── 교수 채점 ──────────────────────────────────────────────

export type GradingFilter = "submitted" | "revision" | "graded" | "all";

export type GradingRow = SubmissionSummary & {
  studentName: string;
  memberNo: string | null;
  classLabel: string;
};

/** 내가 볼 수 있는 학생(같은 학교·같은 방)의 제출. 채점 대기가 먼저, 그 안에서는 먼저 낸 순 */
export async function listGradingSubmissions(
  prof: Prof,
  filter: GradingFilter,
): Promise<GradingRow[]> {
  const rows = await db.caseSubmission.findMany({
    where: {
      student: visibleStudents(prof),
      ...(filter === "all" ? {} : { status: filter }),
    },
    orderBy:
      filter === "submitted"
        ? [{ submittedAt: "asc" }]
        : [{ submittedAt: "desc" }],
    take: 100,
    select: {
      ...summarySelect,
      student: {
        select: { name: true, memberNo: true, grade: true, classGroup: true },
      },
    },
  });
  return rows.map(({ student, ...r }) => ({
    ...toSummary(r),
    studentName: student.name,
    memberNo: student.memberNo,
    classLabel: [
      student.grade && `${student.grade}학년`,
      student.classGroup && `${student.classGroup}반`,
    ]
      .filter(Boolean)
      .join(" "),
  }));
}

export async function countGradingByStatus(prof: Prof) {
  const rows = await db.caseSubmission.groupBy({
    by: ["status"],
    where: { student: visibleStudents(prof) },
    _count: true,
  });
  const count = (s: SubmissionStatus) =>
    rows.find((r) => r.status === s)?._count ?? 0;
  return {
    submitted: count("submitted"),
    revision: count("revision"),
    graded: count("graded"),
  };
}

export type GradingDetail = GradingRow & { memo: string; ai: CaseAiResult };

/** 채점할 제출 한 건 (볼 수 없는 학생 것이면 null) */
export async function getGradingDetail(
  prof: Prof,
  id: string,
): Promise<GradingDetail | null> {
  const row = await db.caseSubmission.findFirst({
    where: { id, student: visibleStudents(prof) },
    select: {
      ...summarySelect,
      memo: true,
      aiResult: true,
      student: {
        select: { name: true, memberNo: true, grade: true, classGroup: true },
      },
    },
  });
  if (!row) return null;
  const { student, memo, aiResult, ...r } = row;
  const ai = storedCaseAiSchema.safeParse(aiResult);
  if (!ai.success) return null;
  return {
    ...toSummary(r),
    studentName: student.name,
    memberNo: student.memberNo,
    classLabel: [
      student.grade && `${student.grade}학년`,
      student.classGroup && `${student.classGroup}반`,
    ]
      .filter(Boolean)
      .join(" "),
    memo,
    ai: ai.data,
  };
}

/**
 * 채점(학점·점수·피드백) 또는 보완 요청. 볼 수 있는 학생 것만. 다시 채점해도 된다(마지막 값으로).
 * 학생에게 알림을 같은 트랜잭션으로 보낸다.
 */
export async function gradeSubmission(
  prof: Prof & { name: string },
  id: string,
  input: GradeInput,
): Promise<"saved" | "not_found"> {
  return db.$transaction(async (tx) => {
    const found = await tx.caseSubmission.findFirst({
      where: { id, student: visibleStudents(prof) },
      select: { studentId: true, title: true },
    });
    if (!found) return "not_found" as const;
    const graded = input.decision === "graded";
    await tx.caseSubmission.update({
      where: { id },
      data: {
        status: input.decision,
        grade: graded ? input.grade : null,
        score: input.score,
        feedback: input.feedback || null,
        gradedBy: prof.id,
        gradedAt: new Date(),
      },
      select: { id: true },
    });
    await notify(
      {
        userId: found.studentId,
        kind: graded ? "grade" : "revision",
        title: graded
          ? `케이스 채점 결과: ${input.grade}${input.score !== null ? ` (${input.score}점)` : ""}`
          : "케이스 보완 요청",
        body: `${prof.name} 교수님 · ${found.title}${input.feedback ? ` — ${input.feedback.slice(0, 120)}` : ""}`,
        link: "/submissions",
      },
      tx,
    );
    return "saved" as const;
  });
}
