// 실습 이수 상태: 학생 배너·교수 현황판·CSV가 같은 기준을 쓴다.
// 기준은 간호교육인증평가 졸업 기준 1,000시간 고정 (학생이 바꾸는 개인 목표와는 별개).

export const GRADUATION_HOURS = 1000;
/** 데모 새 버전 기준: 누적 500시간 미만이면 위험군 */
export const RISK_HOURS = 500;

export type PracticeStatus = "DONE" | "NORMAL" | "RISK" | "START";

export function practiceStatus(hours: number): PracticeStatus {
  if (hours >= GRADUATION_HOURS) return "DONE";
  if (hours <= 0) return "START";
  if (hours < RISK_HOURS) return "RISK";
  return "NORMAL";
}

/** 1,000시간 대비 달성률 (소수 첫째 자리, 최대 100) */
export function graduationPercent(hours: number) {
  return Math.min(100, Math.round((hours / GRADUATION_HOURS) * 1000) / 10);
}

export const STATUS_TEXT: Record<PracticeStatus, { label: string; tone: "pink" | "warn" | "brand" | "neutral"; csv: string }> = {
  DONE: { label: "🎓 1,000시간 달성", tone: "pink", csv: "이수 완료" },
  NORMAL: { label: "정상 이수중", tone: "brand", csv: "정상 이수중" },
  RISK: { label: "⚠️ 미달 위험", tone: "warn", csv: "미달 위험(500시간 미만)" },
  START: { label: "실습 시작 전", tone: "neutral", csv: "실습 시작 전(0시간)" },
};
