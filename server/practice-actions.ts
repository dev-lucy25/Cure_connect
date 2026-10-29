"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import * as repo from "@/server/practice-repo";
import { fieldErrorsOf } from "@/lib/validation/form";
import { weekdaysFrom } from "@/lib/dates";
import {
  goalSchema,
  idSchema,
  logSchema,
  scheduleSchema,
  bulkLogSchema,
  isBulkDays,
  WEEK_DAY_HOURS,
  type FormState,
  type LogField,
  type ScheduleField,
} from "@/lib/validation/practice";

// 모든 처리는 첫 줄에서 로그인을 서버에서 다시 확인하고, 그 사용자 것만 바꾼다.

const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요";
const DELETE_FAILED = "지우지 못했어요. 잠시 후 다시 시도해 주세요";
const NOT_FOUND = "이미 지워졌거나 찾을 수 없는 항목이에요";

function optionalId(formData: FormData) {
  const raw = formData.get("id");
  if (raw === null || raw === "") return { ok: true as const, id: null };
  const parsed = idSchema.safeParse(raw);
  return parsed.success ? { ok: true as const, id: parsed.data } : { ok: false as const };
}

function pick<F extends string>(formData: FormData, fields: readonly F[]) {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")])) as Record<F, string>;
}

const LOG_FIELDS = ["date", "subject", "shift", "hospital", "ward", "hours", "activities", "difficulty", "wardCategory"] as const;
const LOCKED = "교수님이 인증한 일지라 고치거나 지울 수 없어요";

/** 일지 폼 값 + 어려웠던 술기(체크박스 여러 개 → 쉼표로) */
function logValues(formData: FormData) {
  return { ...pick(formData, LOG_FIELDS), hardSkills: formData.getAll("hardSkills").map(String).join(",") };
}
const SCHEDULE_FIELDS = [
  "kind",
  "hospital",
  "ward",
  "startDate",
  "endDate",
  "subject",
  "department",
  "shift",
  "shiftStart",
  "shiftEnd",
  "meetingPlace",
  "meetingTime",
  "preceptor",
  "commonDiseases",
  "groupName",
  "teammates",
  "prepNotes",
] as const;

export async function saveLog(_prev: FormState<LogField>, formData: FormData): Promise<FormState<LogField>> {
  const user = await getCurrentUser();
  const values = logValues(formData);
  const target = optionalId(formData);
  if (!target.ok) return { message: NOT_FOUND, values };

  // 1주 일괄: 시작일부터 평일 5일에 8시간씩 (새로 쓸 때만)
  // 여러 날 일괄(2일·1주·2주): 시작일부터 평일 n일에 8시간씩 (새로 쓸 때만). 예전 "week" = 5일
  const bulkRaw = formData.get("bulk");
  const bulkDays = bulkRaw === "week" ? 5 : Number(bulkRaw);
  if (!target.id && bulkRaw && isBulkDays(bulkDays)) {
    const parsed = bulkLogSchema(bulkDays).safeParse(values);
    if (!parsed.success) return { fieldErrors: fieldErrorsOf<LogField>(parsed.error), values };
    const { date, ...rest } = parsed.data;
    let result;
    try {
      result = await repo.createWeekLogs(
        user.id,
        weekdaysFrom(date, bulkDays).map((day) => ({ ...rest, date: day, hours: WEEK_DAY_HOURS })),
      );
    } catch {
      return { message: SAVE_FAILED, values };
    }
    if (result.added === 0) return { message: "그 기간은 이미 날마다 기록이 있어요. 하루씩 고쳐 주세요", values };
    refresh();
    return { savedAt: Date.now(), notice: result.skipped ? `${result.added}일 기록했어요 (이미 기록한 ${result.skipped}일은 건너뜀)` : undefined };
  }

  const parsed = logSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<LogField>(parsed.error), values };

  let result: repo.LogWriteResult;
  try {
    result = target.id ? await repo.updateLog(user.id, target.id, parsed.data) : await repo.createLog(user.id, parsed.data);
  } catch {
    return { message: SAVE_FAILED, values };
  }
  if (result.status === "not_found") return { message: NOT_FOUND, values };
  if (result.status === "locked") return { message: LOCKED, values };
  if (result.status === "over_day") {
    const left = result.left > 0 ? ` 이 날은 ${result.left}시간까지 더 기록할 수 있어요` : " 이 날은 이미 24시간이 기록돼 있어요";
    return { fieldErrors: { hours: `하루 합계가 24시간을 넘어요.${left}` }, values };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function removeLog(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  try {
    const result = await repo.deleteLog(user.id, id.data);
    if (result === "not_found") return { message: NOT_FOUND };
    if (result === "locked") return { message: LOCKED };
  } catch {
    return { message: DELETE_FAILED };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function loadMoreLogs(cursor: string) {
  const user = await getCurrentUser();
  const parsed = idSchema.safeParse(cursor);
  if (!parsed.success) return { items: [], nextCursor: null };
  return repo.listLogs(user.id, parsed.data);
}

export async function saveSchedule(
  _prev: FormState<ScheduleField>,
  formData: FormData,
): Promise<FormState<ScheduleField>> {
  const user = await getCurrentUser();
  const values = pick(formData, SCHEDULE_FIELDS);
  const target = optionalId(formData);
  if (!target.ok) return { message: NOT_FOUND, values };

  const parsed = scheduleSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<ScheduleField>(parsed.error), values };

  try {
    if (target.id) {
      if (!(await repo.updateSchedule(user.id, target.id, parsed.data))) return { message: NOT_FOUND, values };
    } else {
      await repo.createSchedule(user.id, parsed.data);
    }
  } catch {
    return { message: SAVE_FAILED, values };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function removeSchedule(_prev: FormState<never>, formData: FormData): Promise<FormState<never>> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { message: NOT_FOUND };
  try {
    if (!(await repo.deleteSchedule(user.id, id.data))) return { message: NOT_FOUND };
  } catch {
    return { message: DELETE_FAILED };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function saveGoal(_prev: FormState<"goalHours">, formData: FormData): Promise<FormState<"goalHours">> {
  const user = await getCurrentUser();
  const values = pick(formData, ["goalHours"] as const);
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<"goalHours">(parsed.error), values };
  try {
    await repo.updateGoal(user.id, parsed.data.goalHours);
  } catch {
    return { message: SAVE_FAILED, values };
  }
  refresh();
  return { savedAt: Date.now() };
}
