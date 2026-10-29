import type { Shift, Subject } from "@/generated/prisma/client";

// 간호교육인증평가 전공 영역별 기준 시간 (합 1,000시간). 화면·검증·집계가 모두 이 표를 쓴다.
export const SUBJECTS = [
  { key: "adult", label: "성인간호학", target: 320 },
  { key: "maternal", label: "모성간호학", target: 120 },
  { key: "child", label: "아동간호학", target: 120 },
  { key: "community", label: "지역사회간호학", target: 160 },
  { key: "psych", label: "정신간호학", target: 160 },
  { key: "management", label: "간호관리학", target: 120 },
] as const satisfies readonly { key: Subject; label: string; target: number }[];

export const SUBJECT_KEYS = SUBJECTS.map((s) => s.key) as [Subject, ...Subject[]];

export function subjectLabel(key: Subject) {
  return SUBJECTS.find((s) => s.key === key)?.label ?? key;
}

export const SHIFTS = [
  { key: "day", label: "Day" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
] as const satisfies readonly { key: Shift; label: string }[];

export const SHIFT_KEYS = SHIFTS.map((s) => s.key) as [Shift, ...Shift[]];

export function shiftLabel(key: Shift) {
  return SHIFTS.find((s) => s.key === key)?.label ?? key;
}

/** 하루 듀티 = 8시간. "남은 시간 ≈ N일 듀티" 계산에 쓴다 */
export const DUTY_HOURS = 8;

/** 드롭다운(SelectField) 항목 */
export const SUBJECT_OPTIONS = SUBJECTS.map((s) => ({ value: s.key, label: s.label }));
export const SHIFT_OPTIONS = SHIFTS.map((s) => ({ value: s.key, label: s.label }));
export const GRADE_OPTIONS = [1, 2, 3, 4].map((g) => ({ value: String(g), label: `${g}학년` }));
