"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { AI_DAILY_LIMIT, refundAiUse, reserveAiUse } from "@/server/case-repo";
import { AI_FAILURE_MESSAGE } from "@/server/case-gemini";
import { draftJournal, evaluateAnswer } from "@/server/learning-ai";
import { deleteJournal, saveAttempt, saveJournal } from "@/server/learning-repo";
import { findQuestion } from "@/lib/preceptor-questions";
import {
  journalMemoSchema,
  journalSchema,
  journalText,
  preceptorAnswerSchema,
  type JournalField,
  type PreceptorEval,
  type PreceptorField,
} from "@/lib/validation/learning";
import { fieldErrorsOf, idSchema, type FormState } from "@/lib/validation/form";

// P9 AI 학습 도구 처리. 학생만, AI는 하루 횟수에 포함(실패하면 돌려줌).

const LIMIT = `AI는 하루 ${AI_DAILY_LIMIT}번까지 쓸 수 있어요. 내일 다시 써 주세요`;

async function student() {
  const user = await getCurrentUser();
  return user.role === "student" ? user : null;
}

export type PreceptorState = FormState<PreceptorField> & { result?: PreceptorEval; questionKey?: string };

/** 모의 구술질문 답변 → AI 평가 → 기록 */
export async function evaluateAnswerAction(_prev: PreceptorState, formData: FormData): Promise<PreceptorState> {
  const user = await student();
  const values = { answer: String(formData.get("answer") ?? "") };
  if (!user) return { message: "학생 계정만 쓸 수 있어요", values };
  const parsed = preceptorAnswerSchema.safeParse({
    ward: formData.get("ward"),
    questionKey: formData.get("questionKey"),
    answer: values.answer,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<PreceptorField>(parsed.error), values };
  const q = findQuestion(parsed.data.ward, parsed.data.questionKey);
  if (!q) return { message: "질문을 다시 골라 주세요", values };
  if (!(await reserveAiUse(user.id))) return { message: LIMIT, values };
  const result = await evaluateAnswer(q, parsed.data.answer);
  if (!result.ok) {
    await refundAiUse(user.id);
    return { message: AI_FAILURE_MESSAGE[result.reason], values };
  }
  await saveAttempt(user.id, parsed.data.ward, q.key, parsed.data.answer, result.value);
  refresh();
  return { result: result.value, questionKey: q.key, values };
}

export type JournalDraftState = FormState<JournalField> & { draft?: string };

/** 메모 → AI 일지 초안 (저장 안 함, 아래 칸에서 고쳐 저장) */
export async function draftJournalAction(_prev: JournalDraftState, formData: FormData): Promise<JournalDraftState> {
  const user = await student();
  const values = {
    date: String(formData.get("date") ?? ""),
    ward: String(formData.get("ward") ?? ""),
    memo: String(formData.get("memo") ?? ""),
  };
  if (!user) return { message: "학생 계정만 쓸 수 있어요", values };
  const parsed = journalMemoSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<JournalField>(parsed.error), values };
  if (!(await reserveAiUse(user.id))) return { message: LIMIT, values };
  const result = await draftJournal(parsed.data.ward, parsed.data.memo);
  if (!result.ok) {
    await refundAiUse(user.id);
    return { message: AI_FAILURE_MESSAGE[result.reason], values };
  }
  return { draft: journalText(result.value), values, savedAt: Date.now() };
}

export async function saveJournalAction(_prev: FormState<JournalField>, formData: FormData): Promise<FormState<JournalField>> {
  const user = await student();
  const values = {
    date: String(formData.get("date") ?? ""),
    ward: String(formData.get("ward") ?? ""),
    memo: String(formData.get("memo") ?? ""),
    content: String(formData.get("content") ?? ""),
  };
  if (!user) return { message: "학생 계정만 쓸 수 있어요", values };
  const raw = formData.get("id");
  const id = raw ? idSchema.safeParse(raw) : null;
  if (id && !id.success) return { message: "찾을 수 없는 일지예요", values };
  const parsed = journalSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<JournalField>(parsed.error), values };
  const ok = await saveJournal(user.id, id?.data ?? null, parsed.data).catch(() => false);
  if (!ok) return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  refresh();
  return { savedAt: Date.now(), notice: "실습일지를 저장했어요 📓" };
}

export async function deleteJournalAction(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await student();
  const id = idSchema.safeParse(formData.get("id"));
  if (!user || !id.success) return { message: "찾을 수 없는 일지예요" };
  if (!(await deleteJournal(user.id, id.data).catch(() => false))) return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요" };
  refresh();
  return { savedAt: Date.now() };
}
