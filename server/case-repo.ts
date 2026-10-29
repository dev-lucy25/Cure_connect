import "server-only";
import { db } from "@/lib/db";
import { toDbDate, todayKst } from "@/lib/dates";
import { caseAiResultSchema, type CaseAiResult } from "@/lib/validation/case";

// 케이스 메모 DB 처리. 모든 함수는 userId를 첫 인자로 받고, 그 사용자 것만 읽고 바꾼다.
// userId는 반드시 서버에서 확인한 로그인 사용자(getCurrentUser)의 id여야 한다.

export const CASE_PAGE_SIZE = 20;
export const AI_DAILY_LIMIT = 20;

export type CaseSummary = { id: string; title: string; ward: string; preview: string; hasAi: boolean; stale: boolean; updatedAt: string };
export type CaseDetail = {
  id: string;
  title: string;
  ward: string;
  memo: string;
  ai: CaseAiResult | null;
  /** 정리 뒤에 메모가 바뀌었으면 true */
  stale: boolean;
  aiAt: string | null;
};
type CaseInput = { title: string; ward: string; memo: string };

const isStale = (aiAt: Date | null, memoUpdatedAt: Date) => aiAt !== null && memoUpdatedAt > aiAt;

export async function listCases(userId: string, cursor?: string) {
  const rows = await db.caseNote.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: CASE_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, title: true, ward: true, memo: true, aiAt: true, memoUpdatedAt: true, updatedAt: true },
  });
  const hasMore = rows.length > CASE_PAGE_SIZE;
  const items: CaseSummary[] = rows.slice(0, CASE_PAGE_SIZE).map((r) => ({
    id: r.id,
    title: r.title,
    ward: r.ward,
    preview: r.memo.slice(0, 80),
    hasAi: r.aiAt !== null,
    stale: isStale(r.aiAt, r.memoUpdatedAt),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

/** 내 케이스가 아니면 null */
export async function getCase(userId: string, id: string): Promise<CaseDetail | null> {
  const row = await db.caseNote.findFirst({
    where: { id, userId },
    select: { id: true, title: true, ward: true, memo: true, aiResult: true, aiAt: true, memoUpdatedAt: true },
  });
  if (!row) return null;
  // DB에 저장된 결과도 형식을 다시 확인한다 (깨진 값은 없는 것으로 본다)
  const ai = row.aiResult === null ? null : caseAiResultSchema.safeParse(row.aiResult);
  return {
    id: row.id,
    title: row.title,
    ward: row.ward,
    memo: row.memo,
    ai: ai?.success ? ai.data : null,
    stale: isStale(row.aiAt, row.memoUpdatedAt),
    aiAt: row.aiAt?.toISOString() ?? null,
  };
}

export async function createCase(userId: string, input: CaseInput) {
  const row = await db.caseNote.create({ data: { userId, ...input }, select: { id: true } });
  return row.id;
}

/** 메모 내용이 실제로 바뀐 경우에만 memoUpdatedAt을 갱신한다 (제목만 고치면 "다시 정리"가 뜨지 않게) */
export async function updateCase(userId: string, id: string, input: CaseInput) {
  const current = await db.caseNote.findFirst({ where: { id, userId }, select: { memo: true } });
  if (!current) return false;
  const { count } = await db.caseNote.updateMany({
    where: { id, userId },
    data: { ...input, ...(current.memo !== input.memo ? { memoUpdatedAt: new Date() } : {}) },
  });
  return count === 1;
}

export async function deleteCase(userId: string, id: string) {
  const { count } = await db.caseNote.deleteMany({ where: { id, userId } });
  return count === 1;
}

export async function saveAiResult(userId: string, id: string, result: CaseAiResult, memoAtRequest: string) {
  // 정리하는 동안 메모가 바뀌었다면 그 결과는 옛 메모 기준이므로 aiAt을 메모 수정 시각보다 앞으로 둔다
  const { count } = await db.caseNote.updateMany({
    where: { id, userId, memo: memoAtRequest },
    data: { aiResult: result, aiAt: new Date() },
  });
  return count === 1;
}

/**
 * 오늘 AI 사용 1회를 예약한다. 20회를 넘으면 false.
 * 한 SQL 문으로 "20 미만일 때만 +1"을 하므로 동시에 여러 번 눌러도 20회를 넘지 않는다.
 */
export async function reserveAiUse(userId: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "AiUsage" ("userId", "day", "count")
    VALUES (${userId}::uuid, ${toDbDate(todayKst())}::date, 1)
    ON CONFLICT ("userId", "day")
    DO UPDATE SET "count" = "AiUsage"."count" + 1 WHERE "AiUsage"."count" < ${AI_DAILY_LIMIT}
    RETURNING "count"`;
  return rows.length === 1;
}

/** AI가 실패하면 예약한 1회를 돌려준다 */
export async function refundAiUse(userId: string) {
  await db.$executeRaw`
    UPDATE "AiUsage" SET "count" = "count" - 1
    WHERE "userId" = ${userId}::uuid AND "day" = ${toDbDate(todayKst())}::date AND "count" > 0`;
}

export async function getAiUsedToday(userId: string) {
  const row = await db.aiUsage.findUnique({
    where: { userId_day: { userId, day: toDbDate(todayKst()) } },
    select: { count: true },
  });
  return row?.count ?? 0;
}
