// 교수 화면 시연용 같은 학교 학생들 (seed.ts가 불러 씀): 실습 기록(병동별 난이도·어려웠던 술기) · 모의 구술질문 점수 ·
// 다음 실습 일정 · 과제 제출 · 족보 열람·평점. 익명 통계는 5명 이상 모인 칸만 보이므로 학생 수와 병동 분포를 넉넉히 잡는다.
// 숫자는 학생 순번으로 정해지는 의사 난수라 다시 돌려도 같은 값이 나온다. 고정 id로 upsert해서 여러 번 돌려도 하나씩만 생긴다.
import type { LogStatus, PrismaClient, Subject, WardCategory } from "../generated/prisma/client";
import { PRECEPTOR_QUESTIONS, type PreceptorWard } from "../lib/preceptor-questions";
import { saleShare } from "../lib/credits";
import { preceptorEvalSchema } from "../lib/validation/learning";
import { storedCaseAiSchema } from "../lib/validation/case";
import { seedDemoCases, seedId } from "./seed-content";

export type CohortStudent = {
  email: string;
  name: string;
  memberNo: string;
  grade: number;
  classGroup: string;
  roomCode: string;
  /** normal: 3학년 1·2학기 / risk: 1학기 실습을 거의 못 함 / senior: 4학년(작년 실습 포함) / done: 4학년 1,000시간 달성 */
  track: "normal" | "risk" | "senior" | "done";
};

// 한교수 방 DIT-2026, 박지현 교수 방 DIT-2026A
export const COHORT: CohortStudent[] = [
  { email: "student3@nursepass.test", name: "박민지", memberNo: "20241023", grade: 3, classGroup: "B", roomCode: "DIT-2026", track: "normal" },
  { email: "student4@nursepass.test", name: "최유진", memberNo: "20241031", grade: 3, classGroup: "B", roomCode: "DIT-2026", track: "risk" },
  { email: "student5@nursepass.test", name: "정다은", memberNo: "20241047", grade: 3, classGroup: "B", roomCode: "DIT-2026", track: "normal" },
  { email: "student6@nursepass.test", name: "강서윤", memberNo: "20241008", grade: 3, classGroup: "A", roomCode: "DIT-2026A", track: "normal" },
  { email: "student7@nursepass.test", name: "조하은", memberNo: "20241012", grade: 3, classGroup: "A", roomCode: "DIT-2026A", track: "risk" },
  { email: "student8@nursepass.test", name: "윤지아", memberNo: "20241019", grade: 3, classGroup: "A", roomCode: "DIT-2026A", track: "normal" },
  { email: "student9@nursepass.test", name: "장예린", memberNo: "20241026", grade: 3, classGroup: "A", roomCode: "DIT-2026A", track: "normal" },
  { email: "student10@nursepass.test", name: "임수빈", memberNo: "20241034", grade: 3, classGroup: "A", roomCode: "DIT-2026A", track: "normal" },
  { email: "student11@nursepass.test", name: "한소율", memberNo: "20231017", grade: 4, classGroup: "A", roomCode: "DIT-2026", track: "senior" },
  { email: "student12@nursepass.test", name: "오채원", memberNo: "20231029", grade: 4, classGroup: "B", roomCode: "DIT-2026", track: "done" },
];

type WardMeta = { subject: Subject; hospital: string; ward: string; difficulty: number; skills: string[]; activities: string[] };
const WARDS: Record<WardCategory, WardMeta> = {
  internal: {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "내과병동",
    difficulty: 3.0,
    skills: ["glucose", "medication", "io", "charting"],
    activities: ["활력징후 측정, 식전 혈당 측정 관찰", "투약 라운딩 관찰, 섭취·배설량 기록", "인수인계 참관, 담당 환자 사정"],
  },
  surgical: {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "외과 병동",
    difficulty: 3.3,
    skills: ["aseptic", "positioning", "iv"],
    activities: ["수술 후 환자 통증 사정, 드레싱 관찰", "배액관 배액량 기록, 조기 이상 보조", "수술 전 준비 체크리스트 확인"],
  },
  icu: {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "내과계 중환자실 (MICU)",
    difficulty: 4.3,
    skills: ["suction", "emergency", "iv", "io"],
    activities: ["인공호흡기 환자 관찰, 흡인 전후 산소포화도 확인", "ABGA 해석 연습, 시간당 소변량 기록", "VAP 예방 번들 확인, 체위 변경"],
  },
  er: {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "권역응급의료센터",
    difficulty: 4.1,
    skills: ["emergency", "vitals", "communication"],
    activities: ["트리아지(KTAS) 관찰, 활력징후 측정", "흉통 환자 심전도 측정 보조", "응급 카트 점검, CPR 상황 관찰"],
  },
  pediatric: {
    subject: "child",
    hospital: "부산 ○○아동병원",
    ward: "소아청소년과 병동",
    difficulty: 3.5,
    skills: ["vitals", "communication", "iv"],
    activities: ["영아 활력징후·체중 측정", "수액 속도 확인, 기저귀 무게로 배설량 계산", "보호자 교육 참관, 놀이로 처치 설명"],
  },
  obstetric: {
    subject: "maternal",
    hospital: "부산 ○○여성병원",
    ward: "산과 병동",
    difficulty: 2.8,
    skills: ["communication", "vitals"],
    activities: ["산후 자궁저부·오로 사정 관찰", "모유수유 교육 참관", "분만실 관찰(산모 동의), NST 판독 연습"],
  },
  psychiatric: {
    subject: "psych",
    hospital: "부산 ○○정신건강병원",
    ward: "정신건강의학과 폐쇄병동",
    difficulty: 3.2,
    skills: ["communication", "charting"],
    activities: ["치료적 의사소통 연습, 과정기록 작성", "집단 프로그램(미술치료) 참여", "정신상태검사(MSE) 관찰"],
  },
  community: {
    subject: "community",
    hospital: "부산 ○○구 보건소",
    ward: "보건소 (방문건강관리)",
    difficulty: 2.2,
    skills: ["communication", "vitals"],
    activities: ["방문건강관리 동행, 혈압·혈당 측정", "예방접종 예진 관찰", "보건교육 계획안 작성"],
  },
  operating: {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "수술실",
    difficulty: 3.7,
    skills: ["aseptic"],
    activities: ["수술 손 씻기 실습, 무균 구역 오리엔테이션", "복강경 수술 참관, 순환 간호사 역할 관찰", "회복실 환자 관찰"],
  },
  other: {
    subject: "management",
    hospital: "부산 ○○종합병원",
    ward: "간호부 (간호관리)",
    difficulty: 2.4,
    skills: ["handoff", "charting"],
    activities: ["간호부 조직·인력 배치 오리엔테이션", "수간호사 업무 관찰(근무표·물품 관리)", "SBAR 인수인계 연습"],
  },
};

const HOLIDAYS = new Set([
  "2025-05-05", "2025-05-06", "2025-10-03", "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09",
  "2026-05-05", "2026-05-25", "2026-06-03", "2026-09-24", "2026-09-25", "2026-10-09",
]);
const LAST_DAY = "2026-10-29";
// 2학기: 2주씩 4번 (마지막 주는 아직 인증 전) / 1학기: 2주씩 / 4학년은 작년 실습까지
const SEM2 = ["2026-09-07", "2026-09-21", "2026-10-05", "2026-10-19"];
const SEM1 = ["2026-03-16", "2026-04-06", "2026-05-11", "2026-06-08"];
const LAST_YEAR = ["2025-03-17", "2025-04-14", "2025-05-12", "2025-09-08", "2025-10-13", "2025-11-03"];
const SEM2_WARDS: WardCategory[] = ["internal", "surgical", "icu", "obstetric", "pediatric", "psychiatric", "er", "community"];
const SEM1_WARDS: WardCategory[] = ["internal", "surgical", "operating", "community", "other", "er"];
const PENDING_FROM = "2026-10-26";

// 학생 순번으로 정해지는 의사 난수 (0~1)
function rng(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function weekdays(from: string, days = 14) {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < days; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !HOLIDAYS.has(iso) && iso <= LAST_DAY) out.push(iso);
  }
  return out;
}

function fridayAfter(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7));
  return new Date(`${d.toISOString().slice(0, 10)}T17:30:00+09:00`);
}

/** 학생 한 명의 병동 순환 (시작일 → 병동) */
function plan(i: number, track: CohortStudent["track"]) {
  const blocks: [string, WardCategory][] = SEM2.map((from, b) => [from, SEM2_WARDS[(i * 3 + b) % SEM2_WARDS.length]]);
  const sem1 = track === "risk" ? SEM1.slice(0, 1) : SEM1;
  sem1.forEach((from, b) => blocks.push([from, SEM1_WARDS[(i + b) % SEM1_WARDS.length]]));
  if (track === "senior" || track === "done") {
    const past = track === "done" ? LAST_YEAR : LAST_YEAR.slice(0, 5);
    past.forEach((from, b) => blocks.push([from, SEM2_WARDS[(i + b * 3 + 1) % SEM2_WARDS.length]]));
  }
  return blocks;
}

// 모의질문: 모두 같은 질문 몇 개를 풀어 "가장 어려워한 질문"이 5명 이상으로 묶이게. 질문마다 기본 점수가 다르다
const QUIZ: { ward: PreceptorWard; key: string; base: number }[] = [
  { ward: "icu", key: "icu-abga", base: 58 },
  { ward: "er", key: "er-ktas", base: 63 },
  { ward: "pediatric", key: "ped-dose", base: 69 },
  { ward: "surgical", key: "sur-postop-pain", base: 72 },
  { ward: "psychiatric", key: "psy-hallucination", base: 75 },
  { ward: "obstetric", key: "obs-nst", base: 79 },
  { ward: "internal", key: "int-hypotension", base: 83 },
];

function quizEval(ward: PreceptorWard, key: string, score: number) {
  const q = PRECEPTOR_QUESTIONS[ward].find((x) => x.key === key)!;
  const said = Math.max(1, Math.round((q.keyPoints.length * score) / 100));
  return preceptorEvalSchema.parse({
    score,
    strengths: q.keyPoints.slice(0, Math.min(2, said)).map((k) => `'${k.slice(0, 60)}'을(를) 짚었어요`),
    improvements: q.keyPoints.slice(said).slice(0, 3).map((k) => `'${k.slice(0, 60)}'도 함께 말해 보세요`),
    modelAnswer: q.keyPoints.join(". ").slice(0, 700) + ".",
  });
}

/** 점수만큼 핵심 요점을 짚은 학생 답변 (점수가 낮으면 앞쪽 요점만) */
function quizAnswer(ward: PreceptorWard, key: string, score: number) {
  const q = PRECEPTOR_QUESTIONS[ward].find((x) => x.key === key)!;
  const said = Math.max(1, Math.round((q.keyPoints.length * score) / 100));
  return `${q.keyPoints.slice(0, said).join(", ")} 순서로 하겠습니다.`.slice(0, 1000);
}

const tagOf = (i: number) => `ch${String(i + 1).padStart(2, "0")}`;

export async function seedCohortActivity(
  db: PrismaClient,
  ids: { students: string[]; profId: string; profName: string; orgId: string; tracks: CohortStudent["track"][] },
) {
  let logCount = 0;
  for (const [i, studentId] of ids.students.entries()) {
    const tag = tagOf(i);
    const T = (id: string) => seedId(id, tag);
    const rand = rng(i + 1);
    // 학생마다 조금씩 다른 체감 난이도·실력
    const bias = (rand() - 0.5) * 0.8;
    const skill = Math.round((rand() - 0.5) * 20);

    for (const [from, wardKey] of plan(i, ids.tracks[i])) {
      const w = WARDS[wardKey];
      for (const [d, date] of weekdays(from).entries()) {
        const status: LogStatus = date >= PENDING_FROM ? "pending" : rand() < 0.03 ? "rejected" : "approved";
        const difficulty = Math.max(1, Math.min(5, Math.round(w.difficulty + bias + (rand() - 0.5) * 1.6)));
        const hardSkills = w.skills.filter(() => rand() < 0.45).slice(0, 2);
        const reviewed = status !== "pending";
        const data = {
          date: new Date(`${date}T00:00:00Z`),
          subject: w.subject,
          shift: (wardKey === "icu" || wardKey === "er") && d >= 5 ? ("evening" as const) : ("day" as const),
          hospital: w.hospital,
          ward: w.ward,
          wardCategory: wardKey,
          minutes: 8 * 60,
          activities: w.activities[d % w.activities.length],
          difficulty,
          hardSkills,
          status,
          reviewedBy: reviewed ? ids.profId : null,
          reviewedAt: reviewed ? fridayAfter(date) : null,
        };
        const id = T(`cseedlog${date.replaceAll("-", "")}`);
        await db.practiceLog.upsert({
          where: { id },
          create: { id, userId: studentId, createdAt: new Date(`${date}T18:20:00+09:00`), ...data },
          update: data,
        });
        logCount++;
      }
    }

    // 모의질문: 공통 질문을 9~10월에 한 번씩 (일부는 한 번 더 풀어 점수가 오름)
    for (const [k, q] of QUIZ.entries()) {
      const score = Math.max(30, Math.min(100, q.base + skill + Math.round((rand() - 0.5) * 16)));
      const at = new Date(Date.UTC(2026, 8, 8 + k * 7 + (i % 5), 12, 0));
      const id = T(`cseedquiz${q.key.replace(/-/g, "")}`);
      const data = { wardCategory: q.ward, questionKey: q.key, answer: quizAnswer(q.ward, q.key, score), score, feedback: quizEval(q.ward, q.key, score) };
      await db.preceptorAttempt.upsert({ where: { id }, create: { id, userId: studentId, createdAt: at, ...data }, update: data });
      if (score < 75 && rand() < 0.5) {
        const retry = Math.min(100, score + 12);
        const rid = T(`cseedquizre${q.key.replace(/-/g, "")}`);
        const rdata = { ...data, answer: quizAnswer(q.ward, q.key, retry), score: retry, feedback: quizEval(q.ward, q.key, retry) };
        await db.preceptorAttempt.upsert({ where: { id: rid }, create: { id: rid, userId: studentId, createdAt: new Date(at.getTime() + 3 * 86_400_000), ...rdata }, update: rdata });
      }
    }

    // 앞으로의 실습 일정: 학과가 학기 초에 한 해 일정을 미리 올려 두는 것처럼.
    // 위험군(risk)은 내년 일정이 아직 없어 교수 현황판에서 "보충 검토"로 보인다
    const ahead: [string, string, string, number][] = [
      ["cseedschednext", i % 2 ? "2026-11-02" : "2026-11-09", i % 2 ? "2026-11-13" : "2026-11-20", 4],
      ...(ids.tracks[i] === "done"
        ? []
        : ([
            ["cseedschedwinter", "2026-11-23", "2026-12-11", 5],
            ...(ids.tracks[i] === "risk"
              ? []
              : ([
                  ["cseedsched2027a", "2027-03-08", "2027-04-02", 6],
                  ["cseedsched2027b", "2027-04-12", "2027-05-07", 7],
                ] as [string, string, string, number][])),
          ] as [string, string, string, number][])),
    ];
    for (const [key, start, end, offset] of ahead) {
      const wardKey = SEM2_WARDS[(i * 3 + offset) % SEM2_WARDS.length];
      const w = WARDS[wardKey];
      const sched = {
        kind: "practice" as const,
        subject: w.subject,
        hospital: w.hospital,
        ward: w.ward,
        wardCategory: wardKey,
        startDate: new Date(`${start}T00:00:00Z`),
        endDate: new Date(`${end}T00:00:00Z`),
        shift: "day" as const,
        shiftStart: "08:00",
        shiftEnd: "16:30",
      };
      const sid = T(key);
      await db.practiceSchedule.upsert({ where: { id: sid }, create: { id: sid, userId: studentId, ...sched }, update: sched });
    }
  }

  // 과제 제출: 세 명은 채점 대기, 한 명은 채점 완료
  const SUBMITS = [
    { i: 0, caseId: "cseedcasecs", at: "2026-10-24T21:10:00+09:00", graded: false },
    { i: 2, caseId: "cseedcasedm", at: "2026-10-27T22:30:00+09:00", graded: false },
    { i: 5, caseId: "cseedcasersv", at: "2026-10-28T20:50:00+09:00", graded: false },
    { i: 3, caseId: "cseedcasethr", at: "2026-10-10T21:00:00+09:00", graded: true },
  ];
  for (const s of SUBMITS) {
    const tag = tagOf(s.i);
    const studentId = ids.students[s.i];
    await seedDemoCases(db, studentId, tag, [s.caseId]);
    const caseId = seedId(s.caseId, tag);
    const found = await db.caseNote.findUniqueOrThrow({ where: { id: caseId }, select: { title: true, ward: true, memo: true, aiResult: true } });
    const data = {
      title: found.title,
      ward: found.ward,
      memo: found.memo,
      aiResult: storedCaseAiSchema.parse(found.aiResult),
      orgId: ids.orgId,
      submittedAt: new Date(s.at),
      ...(s.graded
        ? { status: "graded" as const, grade: "B+", score: 86, feedback: "자료 정리는 좋아요. 간호진단 관련 요인을 객관적 자료와 더 연결해 보세요.", gradedBy: ids.profId, gradedAt: new Date(new Date(s.at).getTime() + 86_400_000) }
        : { status: "submitted" as const, grade: null, score: null, feedback: null, gradedBy: null, gradedAt: null }),
    };
    const id = seedId("cseedsubmit", tag);
    await db.caseSubmission.upsert({ where: { id }, create: { id, studentId, caseId, ...data }, update: data });
  }

  // 족보 열람·평점: 실제 열람처럼 크레딧이 오가게 한 트랜잭션으로 (이미 연 족보는 건너뛴다)
  const paid = await db.wardNote.findMany({ where: { id: { startsWith: "cseednote" }, price: 300 }, orderBy: { createdAt: "asc" }, select: { id: true, authorId: true, price: true } });
  const free = await db.wardNote.findMany({ where: { id: { startsWith: "cseednote" }, price: 0 }, select: { id: true } });
  let unlocks = 0;
  for (const [i, userId] of ids.students.entries()) {
    const note = paid[(i * 5) % paid.length];
    if (note.authorId === userId) continue;
    const opened = await db.$transaction(async (tx) => {
      if (await tx.wardNoteUnlock.findUnique({ where: { userId_noteId: { userId, noteId: note.id } }, select: { userId: true } })) return false;
      const { count } = await tx.profile.updateMany({ where: { id: userId, credits: { gte: note.price } }, data: { credits: { decrement: note.price } } });
      if (count === 0) return false;
      const share = saleShare(note.price);
      await tx.profile.update({ where: { id: note.authorId }, data: { credits: { increment: share } }, select: { id: true } });
      await tx.creditLedger.createMany({
        data: [
          { userId, delta: -note.price, reason: "unlock", noteId: note.id, counterpartyId: note.authorId },
          { userId: note.authorId, delta: share, reason: "sale", noteId: note.id, counterpartyId: userId },
        ],
      });
      await tx.wardNoteUnlock.create({ data: { userId, noteId: note.id, createdAt: new Date(Date.UTC(2026, 9, 3 + i, 11)) } });
      await tx.wardNote.update({ where: { id: note.id }, data: { salesCount: { increment: 1 } } });
      return true;
    });
    if (opened) unlocks++;
    const score = 3 + ((i * 7) % 3);
    await db.wardNoteRating.upsert({ where: { userId_noteId: { userId, noteId: note.id } }, create: { userId, noteId: note.id, score }, update: { score } });
    // 무료 족보는 열람 없이도 평점을 줄 수 있다
    const f = free[i % free.length];
    await db.wardNoteRating.upsert({ where: { userId_noteId: { userId, noteId: f.id } }, create: { userId, noteId: f.id, score: 4 + (i % 2) }, update: { score: 4 + (i % 2) } });
  }
  // 평점 합계는 평점 행에서 다시 계산 (여러 번 돌려도 어긋나지 않게)
  const sums = await db.wardNoteRating.groupBy({ by: ["noteId"], where: { noteId: { startsWith: "cseednote" } }, _sum: { score: true }, _count: true });
  for (const s of sums) {
    await db.wardNote.update({ where: { id: s.noteId }, data: { ratingSum: s._sum.score ?? 0, ratingCount: s._count }, select: { id: true } });
  }

  console.log(`같은 학교 학생 ${ids.students.length}명: 실습 기록 ${logCount}건 · 과제 ${SUBMITS.length} · 새 족보 열람 ${unlocks}건 · 평점 ${sums.reduce((n, s) => n + s._count, 0)}개`);
}
