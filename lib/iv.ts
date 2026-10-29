// 수액 주입 속도(gtt) 계산. 화면과 검증이 같은 함수를 쓴다.

export const DROP_FACTORS = [
  { value: 20, label: "일반 수액세트 (20 gtt/mL)" },
  { value: 60, label: "소아·마이크로 (60 gtt/mL)" },
  { value: 15, label: "수혈 세트 (15 gtt/mL)" },
] as const;

export const IV_LIMITS = { volumeMin: 1, volumeMax: 5000, hoursMin: 0.5, hoursMax: 72 } as const;

export type IvResult = { mlPerHr: number; gttPerMin: number; secPerDrop: number };

/** 입력이 범위를 벗어나면 이유 문자열, 아니면 결과 */
export function ivRate(volumeMl: number, hours: number, dropFactor: number): IvResult | string {
  if (!Number.isFinite(volumeMl) || volumeMl < IV_LIMITS.volumeMin || volumeMl > IV_LIMITS.volumeMax) {
    return `총 용량은 ${IV_LIMITS.volumeMin}~${IV_LIMITS.volumeMax.toLocaleString()} mL로 입력해 주세요`;
  }
  if (!Number.isFinite(hours) || hours < IV_LIMITS.hoursMin || hours > IV_LIMITS.hoursMax) {
    return `주입 시간은 ${IV_LIMITS.hoursMin}~${IV_LIMITS.hoursMax}시간으로 입력해 주세요`;
  }
  if (!DROP_FACTORS.some((f) => f.value === dropFactor)) return "수액 세트를 골라 주세요";
  const mlPerHr = volumeMl / hours;
  const gttPerMin = (volumeMl * dropFactor) / (hours * 60);
  return { mlPerHr, gttPerMin, secPerDrop: 60 / gttPerMin };
}
