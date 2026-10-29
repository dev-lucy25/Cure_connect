// 익명 통계(교수 "통계" 탭)용 고정 목록: 어려웠던 술기 · 병동 분류.
// 키는 DB에 저장되므로 바꾸지 말고 추가만 한다.

export const SKILLS = [
  { key: "vitals", label: "활력징후 측정" },
  { key: "medication", label: "투약 (경구·주사)" },
  { key: "iv", label: "수액·IV 관리" },
  { key: "aseptic", label: "무균술·드레싱" },
  { key: "suction", label: "흡인" },
  { key: "glucose", label: "혈당 측정·인슐린" },
  { key: "io", label: "섭취·배설량" },
  { key: "positioning", label: "체위 변경·낙상 예방" },
  { key: "charting", label: "간호기록 (EMR)" },
  { key: "handoff", label: "인수인계" },
  { key: "communication", label: "환자·보호자 의사소통" },
  { key: "emergency", label: "응급 상황 대처" },
] as const;

export type SkillKey = (typeof SKILLS)[number]["key"];
export const SKILL_KEYS = SKILLS.map((s) => s.key) as [SkillKey, ...SkillKey[]];
export const skillLabel = (key: string) => SKILLS.find((s) => s.key === key)?.label ?? key;

export const WARD_CATEGORIES = [
  { key: "internal", label: "내과" },
  { key: "surgical", label: "외과" },
  { key: "icu", label: "중환자실" },
  { key: "er", label: "응급실" },
  { key: "pediatric", label: "소아" },
  { key: "obstetric", label: "산부인과" },
  { key: "psychiatric", label: "정신" },
  { key: "community", label: "지역사회" },
  { key: "operating", label: "수술실" },
  { key: "other", label: "기타" },
] as const;

export type WardCategoryKey = (typeof WARD_CATEGORIES)[number]["key"];
export const WARD_CATEGORY_KEYS = WARD_CATEGORIES.map((w) => w.key) as [WardCategoryKey, ...WardCategoryKey[]];
export const wardCategoryLabel = (key: string | null) => WARD_CATEGORIES.find((w) => w.key === key)?.label ?? "";

export const DIFFICULTY_LABELS = ["", "아주 쉬웠어요", "쉬웠어요", "보통", "어려웠어요", "아주 어려웠어요"] as const;
