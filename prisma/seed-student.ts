// 체험 학생(김하늘)의 실습 활동 예시 (seed.ts가 불러 씀): 실습 기록 · 실습 일정 · 실습일지 · 모의 구술질문 · 케이스 대화·과제 제출 · 알림.
// 3학년 1학기(3~6월)와 2학기(9월~) 실습을 병동을 돌며 해 온 것으로 지어냈다. 고정 id로 upsert해서 여러 번 돌려도 하나씩만 생긴다.
// id는 앱이 주소로 받을 때 cuid 형식인지 검사하므로(idSchema) c로 시작하는 9자 이상 영문·숫자로 둔다.
import type { LogStatus, PrismaClient, Shift, Subject, WardCategory } from "../generated/prisma/client";
import { PRECEPTOR_QUESTIONS, type PreceptorWard } from "../lib/preceptor-questions";
import { journalSchema, preceptorAnswerSchema, preceptorEvalSchema, type PreceptorEval } from "../lib/validation/learning";
import { idSchema } from "../lib/validation/form";
import { detectPii } from "../lib/validation/pii";
import { storedCaseAiSchema } from "../lib/validation/case";

type Ids = { studentId: string; profId: string; profName: string; orgId: string };

// 병동 순환: 평일만, 공휴일(추석 9/24·25, 한글날 10/9) 제외. 마지막 순환은 아직 인증 전
type Rotation = {
  subject: Subject;
  hospital: string;
  ward: string;
  wardCategory: WardCategory;
  from: string;
  to: string;
  activities: string[];
  hardSkills: string[][];
};
const HOLIDAYS = new Set(["2026-05-05", "2026-05-25", "2026-06-03", "2026-09-24", "2026-09-25", "2026-10-09"]);
const TODAY = "2026-10-30";

const rotations: Rotation[] = [
  // ── 3학년 1학기 ──
  {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "71병동 (소화기내과)",
    wardCategory: "internal",
    from: "2026-03-16",
    to: "2026-03-27",
    activities: [
      "첫 실습 오리엔테이션, 병동 구조·물품 위치 파악, 활력징후 측정",
      "내시경 전후 환자 금식 확인 관찰, 섭취·배설량 기록",
      "간경화 환자 복위 측정과 복수 관찰, 락툴로오스 투여 관찰",
      "투약 라운딩 관찰, 경구약 5Right 확인 연습",
      "인수인계 참관, 간호기록(EMR) 읽기",
    ],
    hardSkills: [["vitals"], ["io"], ["medication"], ["charting", "handoff"]],
  },
  {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "수술실",
    wardCategory: "operating",
    from: "2026-04-06",
    to: "2026-04-17",
    activities: [
      "수술실 동선·무균 구역 오리엔테이션, 수술 손 씻기 실습",
      "복강경 담낭절제술 참관, 순환 간호사 역할 관찰",
      "수술 전 확인(타임아웃) 과정 관찰, 수술 계수 참관",
      "회복실 환자 의식·활력징후 관찰",
      "멸균 물품 포장·유효기간 확인",
    ],
    hardSkills: [["aseptic"], [], ["aseptic", "communication"], ["vitals"]],
  },
  {
    subject: "community",
    hospital: "부산 ○○구 보건소",
    ward: "보건소 (방문건강관리)",
    wardCategory: "community",
    from: "2026-05-11",
    to: "2026-05-22",
    activities: [
      "보건소 사업 오리엔테이션, 지역사회 사정(차창 밖 조사)",
      "방문건강관리 동행, 독거 어르신 혈압·혈당 측정",
      "예방접종실 예진 과정 관찰",
      "고혈압·당뇨 등록 관리 대상자 상담 참관",
      "보건교육 계획안 작성과 발표 준비",
    ],
    hardSkills: [["communication"], ["vitals", "glucose"], ["communication"], [], ["communication"]],
  },
  {
    subject: "management",
    hospital: "부산 ○○종합병원",
    ward: "간호부 · 내과 병동 (간호관리)",
    wardCategory: "other",
    from: "2026-06-08",
    to: "2026-06-19",
    activities: [
      "간호부 조직·인력 배치 오리엔테이션",
      "수간호사 업무 관찰(근무표 작성, 물품 관리)",
      "환자 안전 사고 보고 체계·QI 활동 관찰",
      "인수인계 체계(SBAR) 관찰과 연습",
      "간호관리 과제(근무표 작성 실습) 정리",
    ],
    hardSkills: [["handoff"], [], ["charting"], ["handoff", "communication"]],
  },
  // ── 3학년 2학기 ──
  {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "내과병동 (내분비내과)",
    wardCategory: "internal",
    from: "2026-09-07",
    to: "2026-09-18",
    activities: [
      "오리엔테이션, 병동 구조·물품 위치 파악, 활력징후 측정 관찰",
      "식전 혈당 측정과 인슐린 피하주사 관찰, 저혈당 증상 교육 참관",
      "담당 환자 사정(당뇨 + 폐렴), 섭취·배설량 계산, 발 관찰",
      "투약 카트 라운딩 관찰, 경구약 확인 5Right 연습",
      "간호기록(EMR) 읽기, 인수인계 참관, 케이스 자료 수집",
    ],
    hardSkills: [["glucose"], ["medication", "charting"], ["io"], ["handoff"]],
  },
  {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "정형외과 병동",
    wardCategory: "surgical",
    from: "2026-09-21",
    to: "2026-10-02",
    activities: [
      "고관절 수술 후 환자 활력징후·통증 사정, 낙상 예방 활동",
      "수술 부위 드레싱 관찰, 배액관 배액량 기록",
      "체위 변경 보조, 외전 베개 적용 확인, 고관절 주의사항 교육 참관",
      "수술 전 준비(금식·동의서·장신구 제거) 체크리스트 확인",
      "물리치료 전 진통제 투여 시간 확인, 조기 이상 보조",
    ],
    hardSkills: [["positioning"], ["aseptic"], ["positioning", "communication"], ["iv"]],
  },
  {
    subject: "adult",
    hospital: "부산 ○○대학교병원",
    ward: "내과계 중환자실 (MICU)",
    wardCategory: "icu",
    from: "2026-10-05",
    to: "2026-10-16",
    activities: [
      "인공호흡기 적용 환자 관찰, 기관내 흡인 전후 SpO2 확인",
      "ABGA 결과 해석 연습, 시간당 소변량 기록",
      "VAP 예방 번들(침상머리 30도, 구강 간호, 커프압) 확인",
      "승압제 주입 펌프 확인 관찰, 동맥관 파형 보기",
      "욕창 예방 체위 변경, 브레이든 점수 사정",
    ],
    hardSkills: [["suction", "emergency"], ["io"], ["aseptic"], ["iv", "emergency"], ["positioning"]],
  },
  {
    subject: "maternal",
    hospital: "부산 ○○여성병원",
    ward: "산과 병동",
    wardCategory: "obstetric",
    from: "2026-10-19",
    to: "2026-10-23",
    activities: [
      "산후 자궁저부 높이·오로 사정 관찰, 산모 활력징후 측정",
      "제왕절개 후 1일차 산모 통증 사정, 조기 이상 보조",
      "모유수유 자세(풋볼 자세) 교육 참관, 신생아 젖 물리기 관찰",
      "분만실 관찰(산모 동의), NST 판독 연습",
      "회음부 간호·좌욕 교육 참관, 퇴원 교육 자료 준비",
    ],
    hardSkills: [["communication"], ["vitals"], ["communication"], [], ["communication", "charting"]],
  },
  {
    subject: "child",
    hospital: "부산 ○○아동병원",
    ward: "소아청소년과 병동",
    wardCategory: "pediatric",
    from: "2026-10-26",
    to: "2026-10-29",
    activities: [
      "영아 활력징후 측정(깨기 전 호흡수 먼저), 체중 측정",
      "RSV 환아 비강 흡인 관찰, 산소 포화도 모니터링",
      "수액 속도 확인, 기저귀 무게로 배설량 계산",
      "보호자 교육(호흡곤란 징후) 참관, 놀이로 처치 설명하기",
    ],
    hardSkills: [["vitals"], ["suction"], ["io", "iv"], ["communication"]],
  },
];

function weekdays(from: string, to: string) {
  const days: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !HOLIDAYS.has(iso)) days.push(iso);
  }
  return days;
}

// 그 주 금요일 오후에 교수가 인증한 것으로
function fridayAfter(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7));
  return new Date(`${d.toISOString().slice(0, 10)}T17:30:00+09:00`);
}

type SeedLog = {
  id: string;
  date: string;
  subject: Subject;
  shift: Shift;
  hospital: string;
  ward: string;
  wardCategory: WardCategory;
  minutes: number;
  activities: string;
  difficulty: number;
  hardSkills: string[];
  status: LogStatus;
};

function buildLogs(): SeedLog[] {
  const logs: SeedLog[] = [];
  rotations.forEach((r, ri) => {
    const last = ri === rotations.length - 1;
    weekdays(r.from, r.to).forEach((date, i) => {
      // 중환자실 둘째 주는 이브닝, 그 밖에는 데이
      const shift: Shift = r.wardCategory === "icu" && i >= 5 ? "evening" : "day";
      // 중환자실 마지막 날은 시간을 12로 잘못 적어 반려된 기록
      const rejected = r.wardCategory === "icu" && date === r.to;
      logs.push({
        id: `cseedlog${date.replaceAll("-", "")}`,
        date,
        subject: r.subject,
        shift,
        hospital: r.hospital,
        ward: r.ward,
        wardCategory: r.wardCategory,
        minutes: rejected ? 12 * 60 : 8 * 60,
        activities: r.activities[i % r.activities.length],
        difficulty: Math.min(5, (r.wardCategory === "icu" ? 4 : 2) + (i % 3 === 2 ? 1 : 0)),
        hardSkills: r.hardSkills[i % r.hardSkills.length],
        status: last ? "pending" : rejected ? "rejected" : "approved",
      });
    });
  });
  return logs;
}

const journals = [
  {
    id: "cseedjournal1023",
    date: "2026-10-23",
    ward: "산과 병동",
    memo: "제왕절개 후 1일차 산모 모유수유 어려움, 풋볼 자세로 바꾸니 잘 물었음. 자궁저부 배꼽 아래 1FB",
    content: `1. 오늘 실습 내용
- 제왕절개 후 1일차 산모의 자궁저부·오로를 사정하고 활력징후를 측정했다
- 모유수유 교육에 참여해 풋볼 자세로 젖 물리기를 도왔다
2. 새롭게 배운 점
- 수술 부위 통증이 있는 산모는 풋볼 자세나 옆으로 누운 자세가 편하다
- 산후 1~2일차 초유는 양이 적은 것이 정상이며 자주 물리는 것이 중요하다
3. 어려웠던 점 · 개선할 점
- 불안해하는 산모에게 어떤 말로 안심시켜야 할지 망설였다 → 근거를 들어 짧게 설명하는 연습이 필요하다
4. 다음 실습 목표
- 신생아 배뇨·배변 횟수로 수유가 충분한지 확인하는 방법을 직접 설명해 본다`,
  },
  {
    id: "cseedjournal1026",
    date: "2026-10-26",
    ward: "소아청소년과 병동",
    memo: "소아병동 첫날. 영아 호흡수는 깨기 전에 먼저. 체중 기준 수액량 계산 연습",
    content: `1. 오늘 실습 내용
- 소아병동 오리엔테이션을 받고 영아 활력징후를 측정했다
- 담당 간호사 선생님과 체중 기준 수액 유지량을 계산해 보았다
2. 새롭게 배운 점
- 아이가 울기 시작하면 호흡수를 정확히 잴 수 없어서 자고 있을 때 먼저 잰다
- Holliday-Segar 공식으로 하루 수액 유지량을 구할 수 있다
3. 어려웠던 점 · 개선할 점
- 우는 아이 앞에서 손이 느려졌다 → 측정 순서를 미리 정해 두고 들어가기
4. 다음 실습 목표
- 보호자에게 먼저 인사하고 아이 눈높이에서 처치를 설명해 본다`,
  },
  {
    id: "cseedjournal1027",
    date: "2026-10-27",
    ward: "소아청소년과 병동",
    memo: "RSV 세기관지염 영아, 늑간 함몰·비익 확장, 흡인 후 SpO2 97. 보호자 불안 많음",
    content: `1. 오늘 실습 내용
- RSV 세기관지염 영아의 호흡 양상을 관찰하고 비강 흡인 전후 산소포화도를 확인했다
- 기저귀 무게로 배설량을 계산했다
2. 새롭게 배운 점
- 늑간 함몰·비익 확장은 영아의 호흡곤란을 알려 주는 중요한 징후다
- 수유 전에 코를 뚫어 주면 먹는 양이 늘어난다
3. 어려웠던 점 · 개선할 점
- 밤새 잠을 못 잔 보호자에게 교육할 때 말이 길어졌다 → 핵심 세 가지만 전달하기
4. 다음 실습 목표
- 이 환아로 케이스스터디를 정리하고 간호진단 우선순위를 근거와 함께 말해 본다`,
  },
  {
    id: "cseedjournal1028",
    date: "2026-10-28",
    ward: "소아청소년과 병동",
    memo: "수액 속도 확인, 소아 약 용량 이중 확인 과정 관찰. 놀이로 처치 설명",
    content: `1. 오늘 실습 내용
- 수액 주입 속도를 처방과 비교해 확인하고 투약 전 이중 확인 과정을 관찰했다
- 인형으로 채혈 과정을 설명하는 놀이요법을 함께 했다
2. 새롭게 배운 점
- 소아는 체중(kg) 기준 용량이라 소수점 실수가 큰 위험이 된다
- 놀이로 미리 보여 주면 아이가 덜 무서워한다
3. 어려웠던 점 · 개선할 점
- mg/kg 계산이 느렸다 → 매일 두 문제씩 계산 연습하기
4. 다음 실습 목표
- 정신과 실습 전에 치료적 의사소통 기법을 정리한다`,
  },
];

// 모의 구술질문: 다녀온 병동의 질문을 풀어 본 기록 (80점 미만은 "다시 볼 질문"에 남는다)
const attempts: { id: string; ward: PreceptorWard; key: string; answer: string; at: string; eval: PreceptorEval }[] = [
  {
    id: "cseedquizinsulin",
    ward: "internal",
    key: "int-insulin",
    at: "2026-09-10T21:00:00+09:00",
    answer: "저혈당을 가장 주의해서 봐야 합니다. 식은땀, 손떨림, 어지러움, 빈맥, 의식 변화가 나타나면 바로 혈당을 재고 담당 선생님께 보고하겠습니다.",
    eval: {
      score: 88,
      strengths: ["저혈당을 정확히 짚고 대표 증상을 고르게 말했어요", "혈당 측정 → 보고 순서가 분명해요"],
      improvements: ["식사 시간과 인슐린 투여 시간을 함께 확인한다는 점을 덧붙이면 더 좋아요"],
      modelAnswer:
        "인슐린 투여 후 가장 주의할 부작용은 저혈당입니다. 식은땀, 떨림, 어지러움, 빈맥, 의식 변화를 관찰하고, 증상이 있으면 즉시 혈당을 측정해 지도간호사에게 보고합니다. 또 식사 시간과 투여 시간이 맞는지 확인합니다.",
    },
  },
  {
    id: "cseedquizpostop",
    ward: "surgical",
    key: "sur-postop-pain",
    at: "2026-09-29T21:30:00+09:00",
    answer: "통증 위치와 양상을 물어보고 진통제를 드리겠습니다.",
    eval: {
      score: 62,
      strengths: ["통증 위치와 양상을 묻는 사정부터 시작한 점은 좋아요"],
      improvements: [
        "학생간호사는 진통제를 직접 줄 수 없어요 — 지도간호사에게 보고해야 해요",
        "활력징후와 수술 부위(출혈·부종) 확인을 함께 말해 보세요",
        "처치 후 재사정(30분~1시간 뒤 NRS)까지 말하면 완성이에요",
      ],
      modelAnswer:
        "통증 위치·양상·지속 시간과 NRS를 다시 사정하고 활력징후와 수술 부위의 출혈·부종을 확인합니다. 결과를 지도간호사에게 즉시 보고하고, 처방된 진통제 투여를 보조하며 자세 변경 같은 비약물적 방법을 함께 적용한 뒤 효과를 재사정합니다.",
    },
  },
  {
    id: "cseedquizfundus",
    ward: "obstetric",
    key: "obs-fundus",
    at: "2026-10-21T20:40:00+09:00",
    answer: "먼저 방광을 비우게 한 뒤 배꼽을 기준으로 자궁저부 높이를 손가락 수로 재고, 단단한지와 위치를 확인합니다. 오로의 양과 색도 함께 보고 이상하면 보고합니다.",
    eval: {
      score: 94,
      strengths: ["방광 비우기부터 시작하는 순서가 정확해요", "높이·단단함·위치·오로까지 빠짐없이 말했어요"],
      improvements: ["자궁이 물렁하면 자궁저부 마사지를 한다는 점을 덧붙여 보세요"],
      modelAnswer:
        "방광을 먼저 비우게 한 뒤 배꼽 기준 손가락 수로 자궁저부 높이를 재고 단단함과 위치(정중앙 여부)를 확인합니다. 오로의 양·색을 함께 사정하고, 물렁하거나 출혈이 많으면 마사지 후 즉시 보고합니다.",
    },
  },
  {
    id: "cseedquizpeddose",
    ward: "pediatric",
    key: "ped-dose",
    at: "2026-10-28T21:10:00+09:00",
    answer: "체중을 확인해서 mg/kg로 계산하고 처방이랑 맞는지 봅니다.",
    eval: {
      score: 70,
      strengths: ["체중 기준(mg/kg) 계산을 먼저 떠올린 점이 좋아요"],
      improvements: ["다른 간호사와 이중 확인한다는 점을 꼭 넣어 주세요", "최대 용량을 넘는지 확인하고, 의심되면 투여 전 보고한다고 말해 보세요"],
      modelAnswer:
        "아이의 체중(kg)으로 용량을 계산해 처방 용량과 비교하고, 다른 간호사와 이중 확인합니다. 최대 용량을 넘지 않는지 확인하며, 조금이라도 의심되면 투여 전에 보고합니다.",
    },
  },
];

const chats = [
  {
    id: "cseedchatrsv1",
    caseId: "cseedcasersv",
    role: "user" as const,
    at: "2026-10-27T19:20:00+09:00",
    content: "체액 부족이랑 비효과적 호흡 양상 중에 왜 호흡이 1순위예요?",
  },
  {
    id: "cseedchatrsv2",
    caseId: "cseedcasersv",
    role: "ai" as const,
    at: "2026-10-27T19:20:20+09:00",
    content:
      "ABC(기도·호흡·순환) 원칙 때문이에요. 이 영아는 호흡수 56회/분, 늑간 함몰, 실내공기 SpO2 92%로 산소화가 바로 위협받고 있어요. 체액 부족(체중 3.6% 감소)도 중요하지만 수액으로 교정 중이고 진행 속도가 느려서, 지금 당장 생명을 위협하는 호흡 문제를 먼저 둡니다. 발표 때는 \"객관적 자료 + ABC 원칙\"으로 근거를 말하면 좋아요.",
  },
  {
    id: "cseedchatdm1",
    caseId: "cseedcasedm",
    role: "user" as const,
    at: "2026-09-10T20:05:00+09:00",
    content: "15-15 규칙이 정확히 뭐예요? 환자 교육할 때 어떻게 말하면 돼요?",
  },
  {
    id: "cseedchatdm2",
    caseId: "cseedcasedm",
    role: "ai" as const,
    at: "2026-09-10T20:05:18+09:00",
    content:
      "혈당이 70mg/dL 아래로 떨어지면 당질 15g(주스 반 컵, 사탕 3~4개 등)을 먹고 15분 뒤 다시 재는 방법이에요. 그래도 70 미만이면 한 번 더 반복해요. 교육할 때는 \"어지럽거나 식은땀이 나면 → 혈당 재고 → 주스 반 컵 → 15분 뒤 다시 재기\"처럼 행동 순서로 짧게 말하고, 직접 따라 말해 보게 하면 기억에 오래 남아요.",
  },
];

/** 앱 입력 규칙으로 검사한다. 하나라도 어긋나면 아무것도 넣지 않고 멈춘다 */
function validate(logs: SeedLog[]) {
  for (const { id } of [...logs, ...journals, ...attempts, ...chats]) idSchema.parse(id);
  for (const l of logs) {
    if (detectPii(l.activities).length || l.activities.length > 2000) throw new Error(`실습 기록 내용 확인: ${l.date}`);
    if (l.date > TODAY) throw new Error(`앞날짜 기록: ${l.date}`);
  }
  for (const j of journals) journalSchema.parse({ date: j.date, ward: j.ward, memo: j.memo, content: j.content });
  for (const a of attempts) {
    preceptorAnswerSchema.parse({ ward: a.ward, questionKey: a.key, answer: a.answer });
    preceptorEvalSchema.parse(a.eval);
    if (!PRECEPTOR_QUESTIONS[a.ward].some((q) => q.key === a.key)) throw new Error(`없는 질문: ${a.key}`);
  }
  for (const c of chats) if (detectPii(c.content).length) throw new Error(`대화 내용 확인: ${c.id}`);
}

export async function seedStudentActivity(db: PrismaClient, ids: Ids) {
  const logs = buildLogs();
  validate(logs);

  for (const { id, date, ...l } of logs) {
    const reviewed = l.status !== "pending";
    const createdAt = new Date(`${date}T18:10:00+09:00`);
    const data = {
      ...l,
      date: new Date(`${date}T00:00:00Z`),
      reviewedBy: reviewed ? ids.profId : null,
      reviewedAt: reviewed ? fridayAfter(date) : null,
      updatedAt: reviewed ? fridayAfter(date) : createdAt,
    };
    await db.practiceLog.upsert({ where: { id }, create: { id, userId: ids.studentId, createdAt, ...data }, update: data });
  }

  // 지금 도는 소아 병동 + 다음 정신과 실습(홈의 D-day)
  const schedules = [
    {
      id: "cseedschedpeds",
      subject: "child" as const,
      hospital: "부산 ○○아동병원",
      ward: "소아청소년과 병동",
      wardCategory: "pediatric" as const,
      startDate: new Date("2026-10-26T00:00:00Z"),
      endDate: new Date("2026-11-06T00:00:00Z"),
      shift: "day" as const,
      shiftStart: "07:30",
      shiftEnd: "16:00",
      meetingPlace: "본관 2층 간호부 앞",
      meetingTime: "07:20",
      preceptor: "병동 교육 담당 간호사",
      commonDiseases: ["RSV 세기관지염", "폐렴", "급성 장염"],
      groupName: "B-2조",
      teammates: ["이서연"],
      prepNotes: "소아용 청진기, 스티커, 체중별 수액량 계산 연습",
    },
    {
      id: "cseedschedpsy",
      subject: "psych" as const,
      hospital: "부산 ○○정신건강병원",
      ward: "정신건강의학과 폐쇄병동",
      wardCategory: "psychiatric" as const,
      startDate: new Date("2026-11-09T00:00:00Z"),
      endDate: new Date("2026-11-20T00:00:00Z"),
      shift: "day" as const,
      shiftStart: "08:30",
      shiftEnd: "17:00",
      meetingPlace: "별관 1층 안내데스크",
      meetingTime: "08:15",
      preceptor: "실습 지도 간호사",
      commonDiseases: ["조현병", "양극성 장애", "알코올 사용장애"],
      groupName: "B-2조",
      teammates: ["이서연"],
      prepNotes: "끈 없는 실내화, 과정기록 양식 출력, 치료적 의사소통 기법 정리",
    },
  ];
  for (const { id, ...s } of schedules) {
    await db.practiceSchedule.upsert({ where: { id }, create: { id, userId: ids.studentId, kind: "practice", ...s }, update: s });
  }

  for (const { id, date, ...j } of journals) {
    const at = new Date(`${date}T21:30:00+09:00`);
    const data = { ...j, date: new Date(`${date}T00:00:00Z`), updatedAt: at };
    await db.dailyJournal.upsert({ where: { id }, create: { id, userId: ids.studentId, createdAt: at, ...data }, update: data });
  }

  for (const a of attempts) {
    const data = { wardCategory: a.ward, questionKey: a.key, answer: a.answer, score: a.eval.score, feedback: a.eval };
    await db.preceptorAttempt.upsert({ where: { id: a.id }, create: { id: a.id, userId: ids.studentId, createdAt: new Date(a.at), ...data }, update: data });
  }

  for (const { id, at, ...c } of chats) {
    await db.caseChatMessage.upsert({ where: { id }, create: { id, createdAt: new Date(at), ...c }, update: c });
  }

  // 과제 제출: 정형외과 케이스는 채점 완료(A), 중환자실 케이스는 채점 대기 → 교수 화면에서 바로 채점해 볼 수 있다
  const submissions = [
    { id: "cseedsubthr", caseId: "cseedcasethr", at: "2026-10-01T22:00:00+09:00", graded: true },
    { id: "cseedsubvent", caseId: "cseedcasevent", at: "2026-10-16T21:40:00+09:00", graded: false },
  ];
  for (const s of submissions) {
    const found = await db.caseNote.findUniqueOrThrow({ where: { id: s.caseId }, select: { title: true, ward: true, memo: true, aiResult: true } });
    const aiResult = storedCaseAiSchema.parse(found.aiResult);
    const gradedAt = new Date(new Date(s.at).getTime() + 2 * 86_400_000);
    const data = {
      title: found.title,
      ward: found.ward,
      memo: found.memo,
      aiResult,
      orgId: ids.orgId,
      submittedAt: new Date(s.at),
      ...(s.graded
        ? {
            status: "graded" as const,
            grade: "A",
            score: 92,
            feedback:
              "낙상 위험 요인을 자료로 잘 묶었고 우선순위 근거가 분명해요. 고관절 탈구 예방 교육을 환자 눈높이 표현으로 바꿔 보면 더 좋겠어요.",
            gradedBy: ids.profId,
            gradedAt,
          }
        : { status: "submitted" as const, grade: null, score: null, feedback: null, gradedBy: null, gradedAt: null }),
    };
    await db.caseSubmission.upsert({ where: { id: s.id }, create: { id: s.id, studentId: ids.studentId, caseId: s.caseId, ...data }, update: data });
  }

  // 알림: 지난 것은 읽음, 최근 두 개는 안 읽음
  const hours = (status: LogStatus, from: string, to: string) =>
    logs.filter((l) => l.status === status && l.date >= from && l.date <= to).reduce((sum, l) => sum + l.minutes / 60, 0);
  const notes = [
    { id: "cseednotif0918", at: "2026-09-18T17:30:00+09:00", kind: "log_approved", title: "✅ 실습 일지 10건 인증 완료", body: `${ids.profName} 교수님이 ${hours("approved", "2026-09-07", "2026-09-18")}시간을 인증했어요.`, link: "/", read: true },
    { id: "cseednotif1002", at: "2026-10-02T17:30:00+09:00", kind: "log_approved", title: "✅ 실습 일지 8건 인증 완료", body: `${ids.profName} 교수님이 ${hours("approved", "2026-09-21", "2026-10-02")}시간을 인증했어요.`, link: "/", read: true },
    { id: "cseednotifgrade", at: "2026-10-03T22:00:00+09:00", kind: "grade", title: "🎓 케이스 채점 결과: A (92점)", body: `${ids.profName} 교수님 · 고관절 전치환술 후 2일차 낙상 위험 — 낙상 위험 요인을 자료로 잘 묶었고 우선순위 근거가 분명해요.`, link: "/submissions", read: true },
    { id: "cseednotif1016", at: "2026-10-16T17:30:00+09:00", kind: "log_rejected", title: "↩️ 실습 일지 1건 반려", body: `${ids.profName} 교수님: 10월 16일 실습 시간이 12시간으로 되어 있어요. 이브닝 8시간이 맞는지 확인해 다시 올려 주세요.`, link: "/", read: false },
    { id: "cseednotif1023", at: "2026-10-23T17:30:00+09:00", kind: "log_approved", title: "✅ 실습 일지 13건 인증 완료", body: `${ids.profName} 교수님이 ${hours("approved", "2026-10-05", "2026-10-23")}시간을 인증했어요.`, link: "/", read: false },
  ];
  for (const { id, at, read, ...n } of notes) {
    const createdAt = new Date(at);
    const data = { ...n, readAt: read ? new Date(createdAt.getTime() + 3_600_000) : null };
    await db.notification.upsert({ where: { id }, create: { id, userId: ids.studentId, createdAt, ...data }, update: data });
  }

  const approved = logs.filter((l) => l.status === "approved").reduce((s, l) => s + l.minutes, 0) / 60;
  const pending = logs.filter((l) => l.status === "pending").reduce((s, l) => s + l.minutes, 0) / 60;
  console.log(
    `김하늘: 실습 기록 ${logs.length}건(인증 ${approved}시간 · 대기 ${pending}시간) · 일정 ${schedules.length} · 일지 ${journals.length} · 모의질문 ${attempts.length} · 대화 ${chats.length} · 과제 ${submissions.length} · 알림 ${notes.length}`,
  );
}
