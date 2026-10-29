"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser, getOptionalUser } from "@/server/auth";
import * as repo from "@/server/notes-repo";
import { fieldErrorsOf, idSchema, type FormState } from "@/lib/validation/form";
import { noteSchema, type NoteField } from "@/lib/validation/notes";
import { NOTE_CATEGORY_KEYS, UPLOAD_REWARD } from "@/lib/credits";

// 모든 처리는 첫 줄에서 로그인을 서버에서 다시 확인한다. 크레딧이 바뀌는 처리는 repo에서 한 트랜잭션으로 한다.

const NOTE_FIELDS = ["category", "price", "hospital", "ward", "title", "questions", "supplies", "atmosphere", "tips"] as const;
const NOT_FOUND = "이미 지워졌거나 찾을 수 없는 족보예요";

function pick(formData: FormData) {
  return Object.fromEntries(NOTE_FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as Record<NoteField, string>;
}

/** 저장 결과 + 화면에 띄울 안내(보상 받음 / 못 받은 이유) */
export type NoteFormState = FormState<NoteField> & { notice?: string };

const NO_REWARD: Record<NonNullable<repo.CreateResult["noReward"]>, string> = {
  short: "족보를 올렸어요. 시크릿(질문·팁)을 3줄 이상 쓰면 보상을 받을 수 있어요",
  daily: "족보를 올렸어요. 등록 보상은 하루 1번까지라 오늘은 보상이 없어요",
  monthly: "족보를 올렸어요. 등록 보상은 한 달 4번까지라 이번 달은 보상이 없어요",
};

export async function createNoteAction(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await getCurrentUser();
  if (user.role !== "student") return { message: "학생 계정만 족보를 올릴 수 있어요", values: pick(formData) };
  const values = pick(formData);
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<NoteField>(parsed.error), values };
  let result: repo.CreateResult;
  try {
    result = await repo.createNote(user.id, parsed.data);
  } catch {
    return { message: "올리지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  refresh();
  return { savedAt: Date.now(), notice: result.rewarded ? `족보를 올렸어요 · +${UPLOAD_REWARD.toLocaleString()} C 💎` : NO_REWARD[result.noReward!] };
}

export async function updateNoteAction(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await getCurrentUser();
  const values = pick(formData);
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND, values };
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<NoteField>(parsed.error), values };
  try {
    if (!(await repo.updateNote(user.id, id.data, parsed.data))) return { message: NOT_FOUND, values };
  } catch {
    return { message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }
  refresh();
  return { savedAt: Date.now(), notice: "족보를 고쳤어요" };
}

export async function deleteNoteAction(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  let result: repo.DeleteResult;
  try {
    result = await repo.deleteNote(user.id, id.data);
  } catch {
    return { message: "지우지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  if (result === "sold") return { message: "이미 열람한 후배가 있어 지울 수 없어요. 고치기는 할 수 있어요" };
  if (result === "not_found") return { message: NOT_FOUND };
  refresh();
  return { savedAt: Date.now() };
}

/** 열기 결과. insufficient면 화면이 충전소를 연다 */
export type UnlockState = { message?: string; savedAt?: number; insufficient?: boolean };

export async function unlockNoteAction(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  let result: repo.UnlockResult;
  try {
    result = await repo.unlockNote(user.id, id.data);
  } catch {
    return { message: "열지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  if (result === "insufficient") return { message: "크레딧이 부족해요. 충전하거나 내 족보를 올려 적립해 보세요", insufficient: true };
  if (result === "not_found") return { message: NOT_FOUND };
  // 이미 열림·내 족보·무료는 실패가 아니다 (두 기기에서 동시에 누른 경우 등) → 화면만 새로 고친다
  refresh();
  return { savedAt: Date.now() };
}

const rateSchema = z.object({ id: idSchema, score: z.coerce.number().int().min(1).max(5) });

export async function rateNoteAction(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await getCurrentUser();
  const parsed = rateSchema.safeParse({ id: formData.get("id"), score: formData.get("score") });
  if (!parsed.success) return { message: "평점을 다시 골라 주세요" };
  let result: repo.RateResult;
  try {
    result = await repo.rateNote(user.id, parsed.data.id, parsed.data.score);
  } catch {
    return { message: "평점을 저장하지 못했어요" };
  }
  if (result === "locked") return { message: "열람한 족보만 평가할 수 있어요" };
  if (result === "mine") return { message: "내 족보는 평가할 수 없어요" };
  if (result === "not_found") return { message: NOT_FOUND };
  refresh();
  return { savedAt: Date.now() };
}

const filterSchema = z.object({
  category: z.enum(NOTE_CATEGORY_KEYS).optional(),
  ward: z.string().trim().min(1).max(60).optional(),
  sort: z.enum(["new", "popular"]).optional(),
});

/** 목록은 로그인 없이도 볼 수 있다(잠긴 본문은 어차피 보내지 않음) */
export async function loadMoreNotes(filter: repo.NoteFilter, cursor: string) {
  const user = await getOptionalUser();
  const parsedCursor = idSchema.safeParse(cursor);
  const parsedFilter = filterSchema.safeParse(filter);
  if (!parsedCursor.success || !parsedFilter.success) return { items: [], nextCursor: null };
  return repo.listNotes(user?.id ?? null, parsedFilter.data, parsedCursor.data);
}
