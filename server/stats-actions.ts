"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { setStatsOptOut } from "@/server/insights-repo";

// 학생: 교수 익명 통계에 내 일지(난이도·술기)를 넣을지
export async function setStatsOptOutAction(include: boolean): Promise<{ message?: string; savedAt?: number }> {
  const user = await getCurrentUser();
  if (user.role !== "student") return { message: "학생 계정만 바꿀 수 있어요" };
  try {
    await setStatsOptOut(user.id, !include);
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { savedAt: Date.now() };
}
