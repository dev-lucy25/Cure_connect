"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import * as repo from "@/server/case-repo";
import {
  askCase,
  organizeCase,
  reviseCase,
  saveEditedResult,
} from "@/server/case-chat";
import { fieldErrorsOf, idSchema, type FormState } from "@/lib/validation/form";
import {
  AI_SECTIONS,
  caseAiResultSchema,
  caseSchema,
  chatQuestionSchema,
  reviseInstructionSchema,
  type CaseField,
} from "@/lib/validation/case";

// 모든 처리는 첫 줄에서 로그인을 서버에서 다시 확인하고, 그 사용자 것만 바꾼다.

const CASE_FIELDS = ["title", "ward", "memo"] as const;
const NOT_FOUND = "이미 지워졌거나 찾을 수 없는 케이스예요";

function pick(formData: FormData) {
  return Object.fromEntries(
    CASE_FIELDS.map((f) => [f, String(formData.get(f) ?? "")]),
  ) as Record<CaseField, string>;
}

/** 새 케이스를 만들면 바로 그 케이스 화면으로 간다 */
export async function createCaseAction(
  _prev: FormState<CaseField>,
  formData: FormData,
): Promise<FormState<CaseField>> {
  const user = await getCurrentUser();
  const values = pick(formData);
  const parsed = caseSchema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: fieldErrorsOf<CaseField>(parsed.error), values };

  let id: string;
  try {
    id = await repo.createCase(user.id, parsed.data);
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  redirect(`/cases/${id}`);
}

export async function updateCaseAction(
  _prev: FormState<CaseField>,
  formData: FormData,
): Promise<FormState<CaseField>> {
  const user = await getCurrentUser();
  const values = pick(formData);
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND, values };
  const parsed = caseSchema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: fieldErrorsOf<CaseField>(parsed.error), values };

  try {
    if (!(await repo.updateCase(user.id, id.data, parsed.data)))
      return { message: NOT_FOUND, values };
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function deleteCaseAction(
  _prev: FormState<never>,
  formData: FormData,
): Promise<FormState<never>> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  try {
    if (!(await repo.deleteCase(user.id, id.data)))
      return { message: NOT_FOUND };
  } catch {
    return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  redirect("/cases");
}

export async function organizeCaseAction(
  _prev: FormState<never>,
  formData: FormData,
): Promise<FormState<never>> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  try {
    const outcome = await organizeCase(user.id, id.data);
    if (!outcome.ok) return { message: outcome.message };
  } catch {
    return { message: "AI 정리에 실패했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function askCaseAction(
  _prev: FormState<"question">,
  formData: FormData,
): Promise<FormState<"question">> {
  const user = await getCurrentUser();
  const values = { question: String(formData.get("question") ?? "") };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND, values };
  const parsed = chatQuestionSchema.safeParse(values);
  if (!parsed.success)
    return { fieldErrors: fieldErrorsOf<"question">(parsed.error), values };
  try {
    const outcome = await askCase(user.id, id.data, parsed.data.question);
    if (!outcome.ok) return { message: outcome.message, values };
  } catch {
    return {
      message: "AI 응답에 실패했어요. 잠시 후 다시 시도해 주세요",
      values,
    };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function loadMoreCases(cursor: string) {
  const user = await getCurrentUser();
  const parsed = idSchema.safeParse(cursor);
  if (!parsed.success) return { items: [], nextCursor: null };
  return repo.listCases(user.id, parsed.data);
}

/** AI 수정 지시 (빠른 버튼 또는 직접 쓴 지시) */
export async function reviseCaseAction(
  _prev: FormState<"instruction">,
  formData: FormData,
): Promise<FormState<"instruction">> {
  const user = await getCurrentUser();
  const values = { instruction: String(formData.get("instruction") ?? "") };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND, values };
  const parsed = reviseInstructionSchema.safeParse(values.instruction);
  if (!parsed.success)
    return {
      fieldErrors: { instruction: parsed.error.issues[0]?.message },
      values,
    };
  try {
    const outcome = await reviseCase(user.id, id.data, parsed.data);
    if (!outcome.ok) return { message: outcome.message, values };
  } catch {
    return {
      message: "AI 수정에 실패했어요. 잠시 후 다시 시도해 주세요",
      values,
    };
  }
  refresh();
  return { savedAt: Date.now(), notice: "AI가 고쳤어요" };
}

/** 줄마다 한 항목 (빈 줄 무시) */
const lines = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/** SOAPIE 직접 고치기: 제목·S~E(줄마다 한 항목)·간호진단(진단명·관련요인)·빠진 항목 */
export async function editCaseAiAction(
  _prev: FormState<"edit">,
  formData: FormData,
): Promise<FormState<"edit">> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  const diagnoses = [0, 1, 2, 3, 4, 5]
    .map((i) => ({
      name: String(formData.get(`dx_name_${i}`) ?? "").trim(),
      relatedTo: String(formData.get(`dx_related_${i}`) ?? "").trim(),
      domain: String(formData.get(`dx_domain_${i}`) ?? ""),
    }))
    .filter((d) => d.name)
    .map((d, i) => ({ ...d, priority: i + 1 }));
  const parsed = caseAiResultSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    ...Object.fromEntries(AI_SECTIONS.map((k) => [k, lines(formData, k)])),
    diagnoses,
    missingInfo: lines(formData, "missingInfo"),
  });
  if (!parsed.success)
    return {
      message: "한 줄은 300자, 항목은 12개, 진단명은 100자까지 쓸 수 있어요",
    };
  try {
    const outcome = await saveEditedResult(user.id, id.data, parsed.data);
    if (!outcome.ok) return { message: outcome.message };
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  refresh();
  return { savedAt: Date.now(), notice: "고친 내용을 저장했어요" };
}
