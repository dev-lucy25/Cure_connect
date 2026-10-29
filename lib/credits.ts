import type { NoteCategory } from "@/generated/prisma/client";

// 크레딧 경제 (데모 기준, 2026-10-29 확정). 화면·검증·DB 처리가 모두 이 값만 쓴다.

/** 가입 보너스 — DB 기본값(Profile.credits)과 같아야 한다 */
export const SIGNUP_BONUS = 300;

/** 족보 등록 보상. 악용을 막으려고 하루 1회·한 달 4회까지, 시크릿 내용이 충분할 때만 */
export const UPLOAD_REWARD = 500;
export const UPLOAD_REWARD_PER_DAY = 1;
export const UPLOAD_REWARD_PER_MONTH = 4;
/** 보상 받을 최소 분량: 시크릿(자주 받은 질문 + 팁) 합계 3줄 이상 또는 150자 이상 */
export const REWARD_MIN_LINES = 3;
export const REWARD_MIN_CHARS = 150;

/** 열람 가격(작성자가 고름). 0 = 무료 공개 */
export const NOTE_PRICES = [0, 300, 500] as const;
export type NotePrice = (typeof NOTE_PRICES)[number];

/** 내 족보가 열람되면 가격의 80%를 작성자에게 (소수점 버림) */
export const SALE_SHARE = 0.8;
export const saleShare = (price: number) => Math.floor(price * SALE_SHARE);

/** 충전 상품 (결제는 P5에서 연결) */
export const CREDIT_PACKAGES = [
  { id: "pack_500", credits: 500, priceKrw: 990, label: "병동 1곳 족보팩", hint: "커피 반 값으로 내일 출근 불안감 해소" },
  { id: "pack_2000", credits: 2000, priceKrw: 3900, label: "실습 로테이션 팩", hint: "4개 병동 족보 + 케이스 참고", best: true },
] as const;

export const NOTE_CATEGORIES = [
  { key: "adult", label: "성인간호 (내과/외과)" },
  { key: "critical", label: "중환자실 / 응급실" },
  { key: "maternal_child", label: "모성 / 아동간호" },
  { key: "psych_community", label: "정신 / 지역사회간호" },
] as const satisfies readonly { key: NoteCategory; label: string }[];

export const NOTE_CATEGORY_KEYS = NOTE_CATEGORIES.map((c) => c.key) as [NoteCategory, ...NoteCategory[]];

export function categoryLabel(key: NoteCategory) {
  return NOTE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

/** 등록 보상을 받을 만큼 시크릿 내용이 충분한가 */
export function rewardEligible(secret: { questions: string[]; tips: string[] }) {
  const lines = [...secret.questions, ...secret.tips];
  return lines.length >= REWARD_MIN_LINES || lines.join("").length >= REWARD_MIN_CHARS;
}

/** 결제 방식: 지금은 가상 결제(실제 돈 없음). 토스페이먼츠 연동 시 "toss"로 바꾸고 server/payment-provider.ts에 승인 처리를 넣는다 */
export const PAYMENT_MODE = "mock" as const;
/** 가상 결제는 하루 3번까지 (크레딧 무한 생성 방지) */
export const MOCK_PURCHASES_PER_DAY = 3;
/** 결제 후 7일 안, 충전받은 크레딧을 쓰지 않았으면 결제 취소 가능 */
export const REFUND_DAYS = 7;

export type CreditPackage = (typeof CREDIT_PACKAGES)[number];
export function findPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
