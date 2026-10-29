"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import * as repo from "@/server/checklist-repo";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { WARD_CHECKLISTS } from "@/lib/ward-checklists";
import { fieldErrorsOf, idSchema, type FormState } from "@/lib/validation/form";

// 체크리스트 처리. 항상 로그인한 본인 것만 바꾼다.

const itemSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { error: "준비물을 입력해 주세요" })
    .max(100, { error: "100자 이하로 입력해 주세요" })
    .superRefine((v, ctx) => {
      const kinds = detectPii(v);
      if (kinds.length > 0) ctx.addIssue({ code: "custom", message: piiMessage(kinds) });
    }),
});

const FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요";

/** 화면에서 바로 체크 표시를 바꾸고(낙관적 갱신) 서버에 맞춘다. 실패하면 false → 화면이 원래대로 돌아간다 */
export async function setChecklistDone(id: string, done: boolean) {
  const user = await getCurrentUser();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success || typeof done !== "boolean") return false;
  try {
    const ok = await repo.setChecklistDone(user.id, parsed.data, done);
    refresh();
    return ok;
  } catch {
    return false;
  }
}

export async function addChecklistItem(_prev: FormState<"text">, formData: FormData): Promise<FormState<"text">> {
  const user = await getCurrentUser();
  const values = { text: String(formData.get("text") ?? "") };
  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<"text">(parsed.error), values };
  try {
    if (!(await repo.addChecklistItem(user.id, parsed.data.text))) {
      return { fieldErrors: { text: `준비물은 ${repo.CHECKLIST_MAX}개까지 적을 수 있어요` }, values };
    }
  } catch {
    return { message: FAILED, values };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function deleteChecklistItem(id: string) {
  const user = await getCurrentUser();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return false;
  try {
    const ok = await repo.deleteChecklistItem(user.id, parsed.data);
    refresh();
    return ok;
  } catch {
    return false;
  }
}

export async function resetChecklist() {
  const user = await getCurrentUser();
  try {
    await repo.resetChecklist(user.id);
  } catch {
    return false;
  }
  refresh();
  return true;
}

/** 병동별 맞춤 항목 불러오기 (lib/ward-checklists.ts) */
export async function importWardChecklist(ward: string): Promise<{ message?: string; savedAt?: number; notice?: string }> {
  const user = await getCurrentUser();
  const items = WARD_CHECKLISTS[ward as keyof typeof WARD_CHECKLISTS];
  if (!items) return { message: "병동을 다시 골라 주세요" };
  const result = await repo.addChecklistItems(user.id, items).catch(() => null);
  if (!result) return { message: "불러오지 못했어요. 잠시 후 다시 시도해 주세요" };
  if (result.added === 0) return { message: "이미 다 들어 있거나 준비물 칸이 가득 찼어요" };
  refresh();
  return { savedAt: Date.now(), notice: `${result.added}개를 불러왔어요${result.skipped ? ` (이미 있는 ${result.skipped}개 제외)` : ""}` };
}
