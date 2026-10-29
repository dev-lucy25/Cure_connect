"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import * as repo from "@/server/case-repo";
import { organizeCase } from "@/server/case-organize";
import { fieldErrorsOf, idSchema, type FormState } from "@/lib/validation/form";
import { caseSchema, type CaseField } from "@/lib/validation/case";

// 모든 처리는 첫 줄에서 로그인을 서버에서 다시 확인하고, 그 사용자 것만 바꾼다.

const CASE_FIELDS = ["title", "ward", "memo"] as const;
const NOT_FOUND = "이미 지워졌거나 찾을 수 없는 케이스예요";

function pick(formData: FormData) {
  return Object.fromEntries(CASE_FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as Record<CaseField, string>;
}

/** 새 케이스를 만들면 바로 그 케이스 화면으로 간다 */
export async function createCaseAction(_prev: FormState<CaseField>, formData: FormData): Promise<FormState<CaseField>> {
  const user = await getCurrentUser();
  const values = pick(formData);
  const parsed = caseSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<CaseField>(parsed.error), values };

  let id: string;
  try {
    id = await repo.createCase(user.id, parsed.data);
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  redirect(`/cases/${id}`);
}

export async function updateCaseAction(_prev: FormState<CaseField>, formData: FormData): Promise<FormState<CaseField>> {
  const user = await getCurrentUser();
  const values = pick(formData);
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND, values };
  const parsed = caseSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<CaseField>(parsed.error), values };

  try {
    if (!(await repo.updateCase(user.id, id.data, parsed.data))) return { message: NOT_FOUND, values };
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function deleteCaseAction(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  try {
    if (!(await repo.deleteCase(user.id, id.data))) return { message: NOT_FOUND };
  } catch {
    return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  redirect("/cases");
}

export async function organizeCaseAction(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
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

export async function loadMoreCases(cursor: string) {
  const user = await getCurrentUser();
  const parsed = idSchema.safeParse(cursor);
  if (!parsed.success) return { items: [], nextCursor: null };
  return repo.listCases(user.id, parsed.data);
}
