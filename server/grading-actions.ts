"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { getGradingDetail, gradeSubmission, type GradingDetail } from "@/server/submission-repo";
import { refundAiUse, reserveAiUse, AI_DAILY_LIMIT } from "@/server/case-repo";
import { AI_FAILURE_MESSAGE } from "@/server/case-gemini";
import { gradingSuggestion } from "@/server/grading-ai";
import { gradeSchema, type GradeField, type GradingAi } from "@/lib/validation/grading";
import { fieldErrorsOf, idSchema, type FormState } from "@/lib/validation/form";

// 교수 채점. 첫 줄에서 교수인지 서버에서 다시 확인하고, 볼 수 있는 학생(같은 학교·같은 방)의 제출만 다룬다.

async function professor() {
  const user = await getCurrentUser();
  return user.role === "professor" ? user : null;
}

const NOT_FOUND = "이미 지워졌거나 볼 수 없는 제출이에요";

/** 채점 창을 열 때 제출 내용 불러오기 */
export async function loadGradingDetail(id: string): Promise<GradingDetail | null> {
  const user = await professor();
  const parsed = idSchema.safeParse(id);
  if (!user || !parsed.success) return null;
  return getGradingDetail(user, parsed.data);
}

export async function gradeAction(_prev: FormState<GradeField>, formData: FormData): Promise<FormState<GradeField>> {
  const user = await professor();
  if (!user) return { message: "교수 계정만 채점할 수 있어요" };
  const values = {
    decision: String(formData.get("decision") ?? ""),
    grade: String(formData.get("grade") ?? ""),
    score: String(formData.get("score") ?? ""),
    feedback: String(formData.get("feedback") ?? ""),
  };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND, values };
  const parsed = gradeSchema.safeParse(values);
  if (!parsed.success) {
    const errors = fieldErrorsOf<GradeField>(parsed.error);
    return { fieldErrors: values.decision ? errors : { ...errors, decision: "채점 완료 또는 보완 요청을 골라 주세요" }, values };
  }
  try {
    if ((await gradeSubmission(user, id.data, parsed.data)) === "not_found") return { message: NOT_FOUND, values };
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  refresh();
  return {
    savedAt: Date.now(),
    notice: parsed.data.decision === "graded" ? `${parsed.data.grade} 채점을 저장하고 학생에게 알렸어요` : "보완 요청을 학생에게 보냈어요",
  };
}

/** 목록의 "A+ 바로 승인" (데모의 원클릭 승인) */
export async function quickApproveAction(id: string): Promise<{ message?: string; savedAt?: number }> {
  const user = await professor();
  const parsed = idSchema.safeParse(id);
  if (!user || !parsed.success) return { message: NOT_FOUND };
  const result = await gradeSubmission(user, parsed.data, { decision: "graded", grade: "A+", score: null, feedback: "" }).catch(() => null);
  if (result !== "saved") return { message: result === null ? "저장하지 못했어요. 잠시 후 다시 시도해 주세요" : NOT_FOUND };
  refresh();
  return { savedAt: Date.now() };
}

/** AI 채점 참고안 (교수 하루 AI 사용 횟수에 포함, 실패하면 횟수 돌려줌) */
export async function gradingAiAction(id: string): Promise<{ suggestion?: GradingAi; message?: string }> {
  const user = await professor();
  const parsed = idSchema.safeParse(id);
  if (!user || !parsed.success) return { message: NOT_FOUND };
  const detail = await getGradingDetail(user, parsed.data);
  if (!detail) return { message: NOT_FOUND };
  if (!(await reserveAiUse(user.id))) return { message: `오늘 AI를 ${AI_DAILY_LIMIT}번 모두 썼어요. 내일 다시 시도해 주세요` };
  const result = await gradingSuggestion(detail);
  if (!result.ok) {
    await refundAiUse(user.id);
    return { message: AI_FAILURE_MESSAGE[result.reason] };
  }
  return { suggestion: result.value };
}
