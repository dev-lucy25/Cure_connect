import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, todayKst, toDbDate } from "@/lib/dates";
import { SKILLS, WARD_CATEGORIES, type SkillKey, type WardCategoryKey } from "@/lib/skills";
import { PRECEPTOR_QUESTIONS, PRECEPTOR_WARDS, type PreceptorWard } from "@/lib/preceptor-questions";
import { visibleStudents, type Prof } from "@/server/professor-repo";

// 익명 통계 (교수 "통계" 탭). 개인은 절대 드러나지 않는다:
// 1) 숫자는 묶음으로만, 서로 다른 학생이 K명 미만인 칸은 숨김  2) 학생 이름·개별 기록 없음
// 3) 교수가 원래 볼 수 있는 학생(같은 학교·같은 방)만, 통계 제외(statsOptOut)를 고른 학생은 빠짐  4) 자유 글(활동·메모)은 쓰지 않음

export const K_MIN = 5;
export type InsightPeriod = "4w" | "term" | "all";
export type InsightScope = "all" | "room";

const PERIOD_DAYS: Record<InsightPeriod, number | null> = { "4w": 28, term: 16 * 7, all: null };

/** 숨긴 칸은 null */
export type Cell = { value: number; students: number } | null;

export type Insights = {
  students: number;
  respondents: number;
  logs: number;
  byWard: { key: WardCategoryKey; label: string; avg: Cell; logs: number }[];
  skills: { key: SkillKey; label: string; share: Cell; logs: number }[];
  heatmap: { ward: WardCategoryKey; label: string; cells: { skill: SkillKey; cell: Cell }[] }[];
  weekly: { week: string; avg: Cell }[];
  preceptorByWard: { key: PreceptorWard; label: string; avg: Cell }[];
  hardestQuestions: { key: string; question: string; avg: number; students: number }[];
};

const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
const cell = (value: number, students: Set<string>): Cell => (students.size >= K_MIN ? { value, students: students.size } : null);

/** 그 주 월요일 (YYYY-MM-DD) */
function weekStart(date: string) {
  const d = toDbDate(date);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return fromDbDate(d);
}

export async function getInsights(prof: Prof, period: InsightPeriod, scope: InsightScope): Promise<Insights> {
  const base = visibleStudents(prof);
  const where = scope === "room" && prof.roomCode ? { AND: [base, { roomCode: prof.roomCode }] } : base;
  const students = await db.profile.findMany({ where: { AND: [where, { statsOptOut: false }] }, select: { id: true }, take: 2000 });
  const ids = students.map((s) => s.id);
  const days = PERIOD_DAYS[period];
  const since = days
    ? (() => {
        const d = toDbDate(todayKst());
        d.setUTCDate(d.getUTCDate() - days);
        return d;
      })()
    : undefined;

  const [logs, attempts] = ids.length
    ? await Promise.all([
        db.practiceLog.findMany({
          where: {
            userId: { in: ids },
            ...(since ? { date: { gte: since } } : {}),
            OR: [{ difficulty: { not: null } }, { hardSkills: { isEmpty: false } }],
          },
          select: { userId: true, date: true, difficulty: true, hardSkills: true, wardCategory: true },
          take: 50_000,
        }),
        db.preceptorAttempt.findMany({
          where: { userId: { in: ids }, ...(since ? { createdAt: { gte: since } } : {}) },
          select: { userId: true, wardCategory: true, questionKey: true, score: true },
          take: 50_000,
        }),
      ])
    : [[], []];

  // 병동 분류별 평균 난이도
  const byWard = WARD_CATEGORIES.map((w) => {
    const rows = logs.filter((l) => l.wardCategory === w.key && l.difficulty !== null);
    return {
      key: w.key,
      label: w.label,
      logs: rows.length,
      avg: rows.length ? cell(avg(rows.map((r) => r.difficulty!)), new Set(rows.map((r) => r.userId))) : null,
    };
  });

  // 어려운 술기: 술기를 고른 일지 중 그 술기를 고른 비율
  const withSkills = logs.filter((l) => l.hardSkills.length > 0);
  const skills = SKILLS.map((s) => {
    const rows = withSkills.filter((l) => l.hardSkills.includes(s.key));
    const share = withSkills.length ? Math.round((rows.length / withSkills.length) * 1000) / 10 : 0;
    return { key: s.key, label: s.label, logs: rows.length, share: rows.length ? cell(share, new Set(rows.map((r) => r.userId))) : null };
  }).sort((a, b) => (b.share?.value ?? -1) - (a.share?.value ?? -1));

  // 병동 × 술기: 그 병동 일지 중 그 술기를 고른 비율
  const heatmap = WARD_CATEGORIES.map((w) => {
    const wardRows = withSkills.filter((l) => l.wardCategory === w.key);
    return {
      ward: w.key,
      label: w.label,
      cells: SKILLS.map((s) => {
        const rows = wardRows.filter((l) => l.hardSkills.includes(s.key));
        return {
          skill: s.key,
          cell: rows.length ? cell(Math.round((rows.length / wardRows.length) * 100), new Set(rows.map((r) => r.userId))) : null,
        };
      }),
    };
  }).filter((row) => withSkills.some((l) => l.wardCategory === row.ward));

  // 최근 8주 주별 평균 난이도
  const thisWeek = weekStart(todayKst());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = toDbDate(thisWeek);
    d.setUTCDate(d.getUTCDate() - (7 - i) * 7);
    return fromDbDate(d);
  });
  const weekly = weeks.map((week) => {
    const rows = logs.filter((l) => l.difficulty !== null && weekStart(fromDbDate(l.date)) === week);
    return { week, avg: rows.length ? cell(avg(rows.map((r) => r.difficulty!)), new Set(rows.map((r) => r.userId))) : null };
  });

  // 모의 구술질문: 병동별 평균 점수 · 가장 어려운 질문(평균 점수 낮은 순)
  const preceptorByWard = PRECEPTOR_WARDS.map((w) => {
    const rows = attempts.filter((a) => a.wardCategory === w);
    return {
      key: w,
      label: WARD_CATEGORIES.find((x) => x.key === w)?.label ?? w,
      avg: rows.length ? cell(avg(rows.map((r) => r.score)), new Set(rows.map((r) => r.userId))) : null,
    };
  });
  const byQuestion = new Map<string, { scores: number[]; students: Set<string>; ward: PreceptorWard }>();
  for (const a of attempts) {
    const cur = byQuestion.get(a.questionKey) ?? { scores: [], students: new Set<string>(), ward: a.wardCategory as PreceptorWard };
    cur.scores.push(a.score);
    cur.students.add(a.userId);
    byQuestion.set(a.questionKey, cur);
  }
  const hardestQuestions = [...byQuestion]
    .filter(([, v]) => v.students.size >= K_MIN)
    .map(([key, v]) => ({
      key,
      question: PRECEPTOR_QUESTIONS[v.ward]?.find((q) => q.key === key)?.question ?? key,
      avg: avg(v.scores),
      students: v.students.size,
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  return {
    students: ids.length,
    respondents: new Set(logs.map((l) => l.userId)).size,
    logs: logs.length,
    byWard,
    skills,
    heatmap,
    weekly,
    preceptorByWard,
    hardestQuestions,
  };
}

/** 학생: 익명 통계 제외 켜기·끄기 */
export async function setStatsOptOut(userId: string, optOut: boolean) {
  await db.profile.update({ where: { id: userId }, data: { statsOptOut: optOut }, select: { id: true } });
}

export async function getStatsOptOut(userId: string) {
  return (await db.profile.findUniqueOrThrow({ where: { id: userId }, select: { statsOptOut: true } })).statsOptOut;
}
