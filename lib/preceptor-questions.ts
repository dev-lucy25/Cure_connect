import type { WardCategoryKey } from "@/lib/skills";

// AI 프리셉터 모의 구술질문 은행. 키는 기록(PreceptorAttempt.questionKey)에 남으므로 바꾸지 말고 추가만 한다.
// keyPoints는 AI가 채점할 때 보는 기준이다. 학생간호사는 독립적으로 처치하지 않고 사정 → 보고 → 지시 이행이 원칙.

export type PreceptorQuestion = { key: string; question: string; keyPoints: string[] };

export const PRECEPTOR_WARDS = [
  "internal",
  "surgical",
  "icu",
  "er",
  "pediatric",
  "obstetric",
  "psychiatric",
] as const satisfies readonly WardCategoryKey[];
export type PreceptorWard = (typeof PRECEPTOR_WARDS)[number];

export const PRECEPTOR_QUESTIONS: Record<PreceptorWard, PreceptorQuestion[]> = {
  internal: [
    {
      key: "int-hypotension",
      question: "활력징후를 재다가 환자 혈압이 80/50 mmHg로 갑자기 떨어졌어요. 학생간호사로서 가장 먼저 무엇을 하겠어요?",
      keyPoints: [
        "환자 곁을 떠나지 않고 의식·피부색·맥박 등 상태 재사정",
        "즉시 지도간호사(담당 간호사)에게 보고",
        "지시에 따라 앙와위·하지 거상 등 보조, 독자적 투약·처치 금지",
        "측정값·시간·보고 내용 기록",
      ],
    },
    {
      key: "int-insulin",
      question: "인슐린 피하주사 직후 가장 주의해서 관찰해야 할 부작용과 그 증상은 무엇인가요?",
      keyPoints: ["저혈당", "식은땀·떨림·어지러움·빈맥·의식 변화", "혈당 측정 후 즉시 보고", "식사 시간·투여 시간 확인"],
    },
    {
      key: "int-lactulose",
      question: "간경변 환자에게 락툴로오스를 투여하는 이유는 무엇인가요?",
      keyPoints: ["장에서 암모니아 흡수를 줄이고 배출 증가", "간성뇌증(간성혼수) 예방·치료", "배변 횟수·의식 상태 관찰"],
    },
  ],
  surgical: [
    {
      key: "sur-postop-pain",
      question: "수술 다음 날 환자가 NRS 7점 통증을 호소해요. 어떻게 사정하고 대처하겠어요?",
      keyPoints: [
        "통증 양상·부위·기간·악화 요인 사정(PQRST)",
        "활력징후·수술 부위·배액관 확인",
        "지도간호사에게 보고하고 처방된 진통제 투여 보조",
        "비약물적 중재(체위·심호흡)와 재사정",
      ],
    },
    {
      key: "sur-jp-drain",
      question: "JP 배액관을 가진 환자에게서 무엇을 관찰하고 기록하나요?",
      keyPoints: ["배액량·색깔·성상 기록", "음압 유지·꼬임·막힘 확인", "삽입 부위 발적·누출 확인", "갑자기 선홍색 다량이면 즉시 보고"],
    },
    {
      key: "sur-ambulation",
      question: "수술 후 조기 이상(걷기)을 격려하는 이유와 주의할 점은 무엇인가요?",
      keyPoints: [
        "무기폐·폐렴·심부정맥혈전증·장마비 예방",
        "기립성 저혈압·어지러움 확인 후 천천히",
        "낙상 예방(보조·미끄럼 방지)",
        "통증 조절 후 시행",
      ],
    },
  ],
  icu: [
    {
      key: "icu-gcs",
      question: "GCS 사정 시 자극에도 눈을 뜨지 않고, 말이 없고, 움직임도 없다면 각각 몇 점이고 총점은요?",
      keyPoints: ["E1 V1 M1", "총점 3점", "변화는 즉시 보고", "진정제·기관삽관 시 V 표기 주의"],
    },
    {
      key: "icu-suction",
      question: "기관 흡인(석션) 전후에 지켜야 할 핵심 원칙은 무엇인가요?",
      keyPoints: ["흡인 전후 고농도 산소 공급", "1회 흡인 10~15초 이내", "무균술 유지", "산소포화도·심박수 모니터링, 악화 시 중단·보고"],
    },
    {
      key: "icu-abga",
      question: "ABGA에서 pH 7.30, PaCO2 55 mmHg, HCO3 24 mEq/L이면 어떤 상태인가요?",
      keyPoints: ["산증(pH 낮음)", "PaCO2 상승 → 호흡성 산증", "HCO3 정상 → 보상 안 됨(급성)", "환기 상태 사정·보고"],
    },
  ],
  er: [
    {
      key: "er-ktas",
      question: "응급실 KTAS 분류는 무엇이고, 학생간호사는 어떤 역할을 하나요?",
      keyPoints: [
        "한국형 응급환자 분류도구 1~5단계(1이 가장 위급)",
        "증상·활력징후로 우선순위 결정",
        "학생은 분류 결정이 아니라 관찰·측정 보조",
        "이상 시 즉시 보고",
      ],
    },
    {
      key: "er-chest-pain",
      question: "가슴 통증으로 온 환자에게 가장 먼저 확인해야 할 것은 무엇인가요?",
      keyPoints: ["활력징후·산소포화도", "통증 양상·방사통·발현 시간", "12유도 심전도 신속 시행 보조", "지도간호사·의사에게 즉시 보고"],
    },
    {
      key: "er-fall-patient",
      question: "어지러워하던 환자가 침대에서 일어나다 넘어졌어요. 어떻게 대처하겠어요?",
      keyPoints: [
        "환자를 함부로 일으키지 않고 의식·통증·외상 사정",
        "즉시 도움 요청·보고",
        "활력징후 측정",
        "낙상 보고서 작성·재발 방지 교육",
      ],
    },
  ],
  pediatric: [
    {
      key: "ped-fever-sponge",
      question: "발열 아이에게 미온수 마사지를 하다가 아이가 오한으로 떨면 어떻게 하나요?",
      keyPoints: ["즉시 중단", "오한은 체온을 더 올림", "보고 후 해열제 등 처방 확인", "체온 재측정"],
    },
    {
      key: "ped-dose",
      question: "소아 약물 용량은 어떻게 확인하나요?",
      keyPoints: ["체중(kg) 기준 용량 계산", "처방 용량과 두 번 확인(이중 확인)", "최대 용량 초과 여부", "의심되면 투여 전 보고"],
    },
    {
      key: "ped-rapport",
      question: "주사를 무서워하는 아이와 라포를 형성하려면 어떻게 하나요?",
      keyPoints: ["발달 단계에 맞는 쉬운 설명", "놀이·인형 활용", "보호자 함께 참여", "거짓말하지 않기(안 아프다고 하지 않기)"],
    },
  ],
  obstetric: [
    {
      key: "obs-postpartum-bleeding",
      question: "분만 후 산모에게서 산후출혈을 의심할 수 있는 징후는 무엇인가요?",
      keyPoints: [
        "패드가 빨리 젖는 다량 출혈·응고 덩어리",
        "자궁저부가 물렁함(자궁이완)",
        "빈맥·저혈압·창백",
        "즉시 보고, 자궁저부 마사지 보조",
      ],
    },
    {
      key: "obs-fundus",
      question: "산후 자궁저부 사정은 어떻게 하고 무엇을 보나요?",
      keyPoints: ["방광을 먼저 비움", "높이(배꼽 기준 손가락 수)·단단함·위치", "오로 양·색 함께 확인", "이상 시 보고"],
    },
    {
      key: "obs-nst",
      question: "NST(비수축 검사)에서 반응성(reactive)이란 무엇을 뜻하나요?",
      keyPoints: ["태동 시 태아심박 일시 상승(가속)이 기준 이상", "태아 건강 상태 양호를 시사", "비반응성이면 추가 검사·보고"],
    },
  ],
  psychiatric: [
    {
      key: "psy-hallucination",
      question: "환청을 호소하는 환자와 대화할 때 어떻게 반응하나요?",
      keyPoints: [
        "환청 내용에 동조하거나 논쟁하지 않음",
        "환자의 감정에 초점(반영)",
        "현실 제시는 부드럽게",
        "자해·타해 위험 사정 후 보고",
      ],
    },
    {
      key: "psy-safety",
      question: "정신건강의학과 병동 실습에서 지켜야 할 안전 수칙은 무엇인가요?",
      keyPoints: ["끈·날카로운 물건 반입 금지", "출구 쪽에 서기·혼자 있지 않기", "개인정보·연락처 주지 않기", "위험 징후 즉시 보고"],
    },
    {
      key: "psy-therapeutic",
      question: "치료적 의사소통 기법 세 가지를 예와 함께 말해 보세요.",
      keyPoints: ["경청·반영(감정 되짚기)", "개방형 질문", "명료화·요약", "비판·충고·안심시키기 같은 비치료적 반응 피하기"],
    },
  ],
};

export const findQuestion = (ward: PreceptorWard, key: string) => PRECEPTOR_QUESTIONS[ward].find((q) => q.key === key) ?? null;
/** 80점 미만이면 오답노트 */
export const PASS_SCORE = 80;
