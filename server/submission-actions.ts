"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { submitCase, type SubmitResult } from "@/server/submission-repo";
import { idSchema, type FormState } from "@/lib/validation/form";

// 교수님께 과제 제출. 학생 본인 케이스만, 서버에서 다시 확인한다.

const MESSAGES: Record<Exclude<SubmitResult, "submitted">, string> = {
  no_org: "학교를 연결해야 제출할 수 있어요. 내 정보에서 학교와 학번을 입력해 주세요",
  not_found: "이미 지워졌거나 찾을 수 없는 케이스예요",
  no_ai: "먼저 SOAPIE로 정리한 뒤 제출해 주세요",
  stale: "정리한 뒤에 메모가 바뀌었어요. 다시 정리한 뒤 제출해 주세요",
  pending: "이미 제출해서 채점을 기다리고 있어요",
};

export async function submitCaseAction(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await getCurrentUser();
  if (user.role !== "student") return { message: "학생 계정만 제출할 수 있어요" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: MESSAGES.not_found };

  let result: SubmitResult;
  try {
    result = await submitCase(user.id, user.orgId, id.data);
  } catch {
    return { message: "제출하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  if (result !== "submitted") return { message: MESSAGES[result] };
  refresh();
  return { savedAt: Date.now() };
}
