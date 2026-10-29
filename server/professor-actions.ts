"use server";

import { refresh, updateTag } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { setRoomCode } from "@/server/professor-repo";
import { roomCodeSchema } from "@/lib/validation/auth";
import type { FormState } from "@/lib/validation/form";

// 교수 대시보드 처리. 첫 줄에서 교수 계정인지 서버에서 다시 확인한다.

export async function setRoomCodeAction(_prev: FormState<"roomCode">, formData: FormData): Promise<FormState<"roomCode">> {
  const user = await getCurrentUser();
  if (user.role !== "professor") return { message: "교수 계정만 바꿀 수 있어요" };
  const values = { roomCode: String(formData.get("roomCode") ?? "") };
  const parsed = roomCodeSchema.safeParse(values.roomCode);
  if (!parsed.success) return { fieldErrors: { roomCode: parsed.error.issues[0]?.message }, values };
  let result;
  try {
    result = await setRoomCode(user.id, parsed.data);
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  if (result === "taken") return { fieldErrors: { roomCode: "다른 교수님이 쓰는 방 코드예요" }, values };
  updateTag(`profile:${user.id}`);
  refresh();
  return { savedAt: Date.now() };
}
