import "server-only";
import { db } from "@/lib/db";

// 첫 출근 준비물 체크리스트. userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.

export const CHECKLIST_MAX = 30;

export type ChecklistEntry = { id: string; text: string; done: boolean };

const DEFAULT_ITEMS = [
  "3색 볼펜 + 유성 네임펜 (검정/빨강/파랑)",
  "초침 있는 손목시계 (호흡·맥박 측정용)",
  "흰색 간호화 및 단정한 실습복 다림질",
  "곡반, 포셉(Forceps), 의료용 가위 챙기기",
  "실습 병동 다빈도 의학용어 & 약어 20선 암기",
  "출근 전날 밤 11시 이전 취침하기",
];

const select = { id: true, text: true, done: true } as const;

/**
 * 내 체크리스트. 처음 열면 기본 6개를 넣어 준다.
 * 같은 사용자 요청이 동시에 와도 기본 항목이 두 번 들어가지 않게, 사용자별 잠금(advisory lock) 안에서 확인·추가한다.
 */
export async function listChecklist(userId: string): Promise<ChecklistEntry[]> {
  const existing = await db.checklistItem.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select });
  if (existing.length > 0) return existing;

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checklist:${userId}`}))`;
    const count = await tx.checklistItem.count({ where: { userId } });
    if (count === 0) {
      await tx.checklistItem.createMany({ data: DEFAULT_ITEMS.map((text, i) => ({ userId, text, sortOrder: i })) });
    }
    return tx.checklistItem.findMany({ where: { userId }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select });
  });
}

/** 체크 상태를 원하는 값으로 맞춘다 (연타·재시도에도 결과가 같다) */
export async function setChecklistDone(userId: string, id: string, done: boolean) {
  const { count } = await db.checklistItem.updateMany({ where: { id, userId }, data: { done } });
  return count === 1;
}

export async function addChecklistItem(userId: string, text: string) {
  return db.$transaction(async (tx) => {
    const agg = await tx.checklistItem.aggregate({ where: { userId }, _count: true, _max: { sortOrder: true } });
    if (agg._count >= CHECKLIST_MAX) return false;
    await tx.checklistItem.create({ data: { userId, text, sortOrder: (agg._max.sortOrder ?? -1) + 1 } });
    return true;
  });
}

export async function deleteChecklistItem(userId: string, id: string) {
  const { count } = await db.checklistItem.deleteMany({ where: { id, userId } });
  return count === 1;
}

/** 다음 로테이션 준비용: 모두 체크 해제 */
export async function resetChecklist(userId: string) {
  await db.checklistItem.updateMany({ where: { userId }, data: { done: false } });
}
