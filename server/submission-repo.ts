import "server-only";
import { db } from "@/lib/db";
import { storedCaseAiSchema, type CaseAiResult } from "@/lib/validation/case";
import type { SubmissionStatus } from "@/generated/prisma/client";

// 과제 제출 DB 처리. userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.
// 제출 순간의 메모·AI 결과를 복사해 저장한다 → 이후 케이스를 고치거나 지워도 제출본은 그대로.

export type SubmissionSummary = {
  id: string;
  caseId: string | null;
  title: string;
  ward: string;
  status: SubmissionStatus;
  grade: string | null;
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
  feedback: true,
  submittedAt: true,
  gradedAt: true,
} as const;

type Row = Omit<SubmissionSummary, "submittedAt" | "gradedAt"> & { submittedAt: Date; gradedAt: Date | null };

function toSummary({ submittedAt, gradedAt, ...rest }: Row): SubmissionSummary {
  return { ...rest, submittedAt: submittedAt.toISOString(), gradedAt: gradedAt?.toISOString() ?? null };
}

export type SubmitResult = "submitted" | "no_org" | "not_found" | "no_ai" | "stale" | "pending";

/** 이 케이스의 가장 최근 제출 (없으면 null) */
export async function latestSubmissionForCase(userId: string, caseId: string): Promise<SubmissionSummary | null> {
  const row = await db.caseSubmission.findFirst({
    where: { caseId, studentId: userId },
    orderBy: { submittedAt: "desc" },
    select: summarySelect,
  });
  return row ? toSummary(row) : null;
}

/**
 * 과제 제출. 학교가 있어야 하고(같은 학교 교수가 채점), 메모를 바꾼 뒤 다시 정리하지 않은 결과는 낼 수 없다.
 * 같은 케이스에 채점 대기 제출이 이미 있으면 DB 부분 고유 인덱스가 막는다 → "pending" (연타·동시 제출에도 1건)
 */
export async function submitCase(userId: string, orgId: string | null, caseId: string): Promise<SubmitResult> {
  if (!orgId) return "no_org";
  const found = await db.caseNote.findFirst({
    where: { id: caseId, userId },
    select: { title: true, ward: true, memo: true, aiResult: true, aiAt: true, memoUpdatedAt: true },
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
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return "pending";
    throw error;
  }
  return "submitted";
}

/** 내 제출 최신순 (최근 50개) */
export async function listMySubmissions(userId: string): Promise<SubmissionSummary[]> {
  const rows = await db.caseSubmission.findMany({
    where: { studentId: userId },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: summarySelect,
  });
  return rows.map(toSummary);
}
