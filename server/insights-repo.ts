import "server-only";
import { db } from "@/lib/db";
import { fromDbDate, todayKst, toDbDate } from "@/lib/dates";
import { SKILLS, WARD_CATEGORIES, type SkillKey, type WardCategoryKey } from "@/lib/skills";
import { PRECEPTOR_QUESTIONS, PRECEPTOR_WARDS, type PreceptorWard } from "@/lib/preceptor-questions";
import { visibleStudents, type Prof } from "@/server/professor-repo";

// 익명 통계 (교수 "통계" 탭). 개인은 절대 드러나지 않는다:
// 1) 숫자는 묶음으로만, 서로 다른 학생이 K명 미만인 칸은 숨김  2) 학생 이름·개별 기록 없음
// 3) 교수가 원래 볼 수 있는 학생(같은 학교·같은 방)만, 통계 제외(statsOptOut)를 고른 학생은 빠짐  4) 자유 글(활동·메모)은 쓰지 않음
// 5) 빼기 계산 막기: 학생 수는 구간("5~9명")으로만, 일지 건수는 내보내지 않음. "내 실습반만"은 반 밖 학생이 0명 또는 5명 이상일 때만
// 6) 모의질문 평균은 학생별 평균의 평균 (한 학생이 여러 번 풀어도 한 표)

export const K_MIN = 5;
export type InsightPeriod = "4w" | "term" | "all";
export type InsightScope = "all" | "room";

const PERIOD_DAYS: Record<InsightPeriod, number | null> = { "4w": 28, term: 16 * 7, all: null };

/** 숨긴 칸은 null. 학생 수는 구간 글자로만 */
export type Cell = { value: number; band: string } | null;

/** 학생 수 → 구간 ("5명 미만" / "5~9명" / "10~19명" / "20~49명" / "50명 이상") */
export function studentBand(n: number) {
  if (n < K_MIN) return `${K_MIN}명 미만`;
  if (n < 10) return "5~9명";
  if (n < 20) return "10~19명";
  if (n < 50) return "20~49명";
  return "50명 이상";
}

export type Insights = {
  students: string;
  respondents: string;
  /** 응답 학생이 5명 미만 (대부분 숨겨짐 안내용) */
  fewRespondents: boolean;
  /** "내 실습반만"을 고를 수 있는지 (반 밖 학생이 1~4명이면 빼기로 드러나므로 막음) */
  roomScopeOk: boolean;
  scope: InsightScope;
  byWard: { key: WardCategoryKey; label: string; avg: Cell }[];
  skills: { key: SkillKey; label: string; share: Cell }[];
  heatmap: { ward: WardCategoryKey; label: string; cells: { skill: SkillKey; cell: Cell }[] }[];
  weekly: { week: string; avg: Cell }[];
  preceptorByWard: { key: PreceptorWard; label: string; avg: Cell }[];
  hardestQuestions: { key: string; question: string; avg: number; band: string }[];
};

const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
const cell = (value: number, students: Set<string>): Cell => (students.size >= K_MIN ? { value, band: studentBand(students.size) } : null);

/** 그 주 월요일 (YYYY-MM-DD) */
function weekStart(date: string) {
  const d = toDbDate(date);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return fromDbDate(d);
}

export async function getInsights(prof: Prof, period: InsightPeriod, scope: InsightScope): Promise<Insights> {
  const all = await db.profile.findMany({
    where: { AND: [visibleStudents(prof), { statsOptOut: false }] },
    select: { id: true, roomCode: true },
    take: 2000,
  });
  const outside = prof.roomCode ? all.filter((s) => s.roomCode !== prof.roomCode).length : 0;
  const roomScopeOk = Boolean(prof.roomCode) && (outside === 0 || outside >= K_MIN);
  const effectiveScope: InsightScope = scope === "room" && roomScopeOk ? "room" : "all";
  const ids = (effectiveScope === "room" ? all.filter((s) => s.roomCode === prof.roomCode) : all).map((s) => s.id);
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
      avg: rows.length ? cell(avg(rows.map((r) => r.difficulty!)), new Set(rows.map((r) => r.userId))) : null,
    };
  });

  // 어려운 술기: 술기를 고른 일지 중 그 술기를 고른 비율
  const withSkills = logs.filter((l) => l.hardSkills.length > 0);
  const skills = SKILLS.map((s) => {
    const rows = withSkills.filter((l) => l.hardSkills.includes(s.key));
    const share = withSkills.length ? Math.round((rows.length / withSkills.length) * 1000) / 10 : 0;
    return { key: s.key, label: s.label, share: rows.length ? cell(share, new Set(rows.map((r) => r.userId))) : null };
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

  // 주별 평균 난이도 (최근 8주, "최근 4주"면 4주)
  const thisWeek = weekStart(todayKst());
  const weekCount = period === "4w" ? 4 : 8;
  const weeks = Array.from({ length: weekCount }, (_, i) => {
    const d = toDbDate(thisWeek);
    d.setUTCDate(d.getUTCDate() - (weekCount - 1 - i) * 7);
    return fromDbDate(d);
  });
  const weekly = weeks.map((week) => {
    const rows = logs.filter((l) => l.difficulty !== null && weekStart(fromDbDate(l.date)) === week);
    return { week, avg: rows.length ? cell(avg(rows.map((r) => r.difficulty!)), new Set(rows.map((r) => r.userId))) : null };
  });

  // 모의 구술질문: 병동별 평균 점수 · 가장 어려운 질문(평균 점수 낮은 순)
  /** 학생별 평균 → 그 평균들의 평균 (많이 푼 학생 한 명이 평균을 좌우하지 않게) */
  const perStudentAvg = (rows: typeof attempts) => {
    const by = new Map<string, number[]>();
    for (const r of rows) by.set(r.userId, [...(by.get(r.userId) ?? []), r.score]);
    return { value: avg([...by.values()].map(avg)), students: new Set(by.keys()) };
  };
  const preceptorByWard = PRECEPTOR_WARDS.map((w) => {
    const rows = attempts.filter((a) => a.wardCategory === w);
    const m = perStudentAvg(rows);
    return { key: w, label: WARD_CATEGORIES.find((x) => x.key === w)?.label ?? w, avg: rows.length ? cell(m.value, m.students) : null };
  });
  const byQuestion = new Map<string, { rows: typeof attempts; ward: PreceptorWard }>();
  for (const a of attempts) {
    const cur = byQuestion.get(a.questionKey) ?? { rows: [], ward: a.wardCategory as PreceptorWard };
    cur.rows.push(a);
    byQuestion.set(a.questionKey, cur);
  }
  const hardestQuestions = [...byQuestion]
    .map(([key, v]) => ({ key, ward: v.ward, ...perStudentAvg(v.rows) }))
    .filter((v) => v.students.size >= K_MIN)
    .map((v) => ({
      key: v.key,
      question: PRECEPTOR_QUESTIONS[v.ward]?.find((q) => q.key === v.key)?.question ?? v.key,
      avg: v.value,
      band: studentBand(v.students.size),
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  return {
    students: studentBand(ids.length),
    respondents: studentBand(new Set(logs.map((l) => l.userId)).size),
    fewRespondents: new Set(logs.map((l) => l.userId)).size < K_MIN,
    roomScopeOk,
    scope: effectiveScope,
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
