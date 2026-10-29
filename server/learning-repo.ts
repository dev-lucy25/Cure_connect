import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, toDbDate } from "@/lib/dates";
import { PASS_SCORE, findQuestion, type PreceptorWard } from "@/lib/preceptor-questions";
import type { PreceptorEval } from "@/lib/validation/learning";

// P9 기록 저장. userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.

export type AttemptItem = {
  id: string;
  ward: PreceptorWard;
  questionKey: string;
  question: string;
  answer: string;
  score: number;
  feedback: PreceptorEval;
  createdAt: string;
};

export async function saveAttempt(userId: string, ward: PreceptorWard, questionKey: string, answer: string, result: PreceptorEval) {
  const row = await db.preceptorAttempt.create({
    data: { userId, wardCategory: ward, questionKey, answer, score: result.score, feedback: result },
    select: { id: true },
  });
  return row.id;
}

/**
 * 오답노트: 80점 미만이었던 질문 중 그 뒤로 아직 통과하지 못한 것 (질문마다 가장 최근 시도 1개, 최대 20개)
 */
export async function listMissed(userId: string): Promise<AttemptItem[]> {
  const rows = await db.preceptorAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, wardCategory: true, questionKey: true, answer: true, score: true, feedback: true, createdAt: true },
  });
  const seen = new Set<string>();
  const missed: AttemptItem[] = [];
  for (const r of rows) {
    if (seen.has(r.questionKey)) continue;
    seen.add(r.questionKey);
    if (r.score >= PASS_SCORE) continue;
    const ward = r.wardCategory as PreceptorWard;
    const q = findQuestion(ward, r.questionKey);
    if (!q) continue;
    missed.push({
      id: r.id,
      ward,
      questionKey: r.questionKey,
      question: q.question,
      answer: r.answer,
      score: r.score,
      feedback: r.feedback as PreceptorEval,
      createdAt: r.createdAt.toISOString(),
    });
    if (missed.length >= 20) break;
  }
  return missed;
}

export async function attemptStats(userId: string) {
  const agg = await db.preceptorAttempt.aggregate({ where: { userId }, _count: true, _avg: { score: true } });
  return { count: agg._count, avg: Math.round(agg._avg.score ?? 0) };
}

// ── 실습일지 ──

export type JournalItem = { id: string; date: string; ward: string; memo: string; content: string; updatedAt: string };

export async function listJournals(userId: string): Promise<JournalItem[]> {
  const rows = await db.dailyJournal.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 30,
    select: { id: true, date: true, ward: true, memo: true, content: true, updatedAt: true },
  });
  return rows.map((r) => ({ ...r, date: fromDbDate(r.date), updatedAt: r.updatedAt.toISOString() }));
}

export async function saveJournal(userId: string, id: string | null, input: { date: string; ward: string; memo: string; content: string }) {
  const data = { date: toDbDate(input.date), ward: input.ward, memo: input.memo, content: input.content };
  if (id) {
    const { count } = await db.dailyJournal.updateMany({ where: { id, userId }, data });
    return count === 1;
  }
  await db.dailyJournal.create({ data: { userId, ...data } });
  return true;
}

export async function deleteJournal(userId: string, id: string) {
  const { count } = await db.dailyJournal.deleteMany({ where: { id, userId } });
  return count === 1;
}
