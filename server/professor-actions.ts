"use server";

import { refresh, updateTag } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { z } from "zod";
import { nudgeStudents, setRoomCode } from "@/server/professor-repo";
import { roomCodeSchema } from "@/lib/validation/auth";
import type { FormState } from "@/lib/validation/form";

// 교수 대시보드 처리. 첫 줄에서 교수 계정인지 서버에서 다시 확인한다.

export async function setRoomCodeAction(
  _prev: FormState<"roomCode">,
  formData: FormData,
): Promise<FormState<"roomCode">> {
  const user = await getCurrentUser();
  if (user.role !== "professor")
    return { message: "교수 계정만 바꿀 수 있어요" };
  const values = { roomCode: String(formData.get("roomCode") ?? "") };
  const parsed = roomCodeSchema.safeParse(values.roomCode);
  if (!parsed.success)
    return {
      fieldErrors: { roomCode: parsed.error.issues[0]?.message },
      values,
    };
  let result;
  try {
    result = await setRoomCode(user.id, parsed.data);
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  if (result.status === "taken")
    return {
      fieldErrors: {
        roomCode: "이미 쓰였던 방 코드예요. 다른 코드를 정해 주세요",
      },
      values,
    };
  // 함께 옮긴 학생들의 로그인 정보(방 코드) 캐시도 새로
  for (const id of [user.id, ...result.movedStudentIds])
    updateTag(`profile:${id}`);
  refresh();
  return { savedAt: Date.now() };
}

const nudgeIds = z.array(z.uuid()).min(1).max(500);

/** 독려 알림 보내기 (학생 1명 또는 지금 보이는 학생 전체) */
export async function nudgeAction(
  studentIds: string[],
): Promise<{ message?: string; sentAt?: number; notice?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "professor")
    return { message: "교수 계정만 보낼 수 있어요" };
  const parsed = nudgeIds.safeParse(studentIds);
  if (!parsed.success) return { message: "보낼 학생을 다시 골라 주세요" };
  const result = await nudgeStudents(user, parsed.data).catch(() => null);
  if (!result)
    return { message: "보내지 못했어요. 잠시 후 다시 시도해 주세요" };
  if (result.sent === 0)
    return {
      message: "오늘 이미 독려 알림을 받은 학생이에요 (학생당 하루 1번)",
    };
  refresh();
  const skipped = result.skipped
    ? ` · 오늘 이미 받은 ${result.skipped}명 제외`
    : "";
  return {
    sentAt: Date.now(),
    notice: `${result.sent}명에게 독려 알림을 보냈어요${skipped}`,
  };
}
