// 연령별 활력징후 정상 범위와 즉시 보고(Noti) 기준 — 데모 기준값. 참고용이며 병원·교수님 기준이 우선이다.

export type VitalRow = { group: string; en: string; bp: string; pulse: string; resp: string; temp: string };

export const VITAL_ROWS: VitalRow[] = [
  { group: "성인", en: "Adult", bp: "90~120 / 60~80", pulse: "60 ~ 100", resp: "12 ~ 20", temp: "36.5 ~ 37.5" },
  { group: "노인", en: "Elderly", bp: "수축기 130~140 가능", pulse: "60 ~ 100", resp: "14 ~ 20", temp: "36.0 ~ 37.2" },
  { group: "아동 (학령기)", en: "School-age", bp: "95~110 / 55~70", pulse: "75 ~ 110", resp: "18 ~ 25", temp: "36.5 ~ 37.5" },
  { group: "신생아", en: "Neonate", bp: "60~85 / 40~55", pulse: "120 ~ 160", resp: "30 ~ 60", temp: "36.5 ~ 37.6" },
];

export const VITAL_COLUMNS = [
  { key: "bp", label: "혈압", unit: "BP, mmHg" },
  { key: "pulse", label: "맥박", unit: "PR, 회/분" },
  { key: "resp", label: "호흡", unit: "RR, 회/분" },
  { key: "temp", label: "체온", unit: "BT, °C" },
] as const;

/** 성인 즉시 보고 기준 */
export const NOTI_CRITERIA = ["수축기 혈압 ≥160 또는 <90 mmHg", "맥박 ≥110 또는 <50회/분", "체온 ≥37.8°C", "SpO2 <93%"];
