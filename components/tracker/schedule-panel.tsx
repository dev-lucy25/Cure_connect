"use client";

import { useActionState, useState } from "react";
import { removeSchedule, saveSchedule } from "@/server/practice-actions";
import type { FormState, ScheduleField } from "@/lib/validation/practice";
import type { ScheduleItem } from "@/server/practice-repo";
import { dDayLabel, daysBetween, shortDate } from "@/lib/dates";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import SelectField from "@/components/ui/select-field";
import { SHIFTS, SUBJECTS } from "@/lib/subjects";
import FormStatus from "@/components/ui/form-status";
import { IconPlus } from "@/components/ui/icons";
import RowActions from "@/components/tracker/row-actions";

export default function SchedulePanel({ schedules, today }: { schedules: ScheduleItem[]; today: string }) {
  const [state, action, pending] = useActionState<FormState<ScheduleField>, FormData>(saveSchedule, {});
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const adding = openedAt !== null && !(state.savedAt && state.savedAt > openedAt);

  return (
    <section aria-labelledby="schedule-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="schedule-title" className="text-title font-bold">
          실습 일정
        </h2>
        <div className="flex items-center gap-2">
          <FormStatus savedAt={state.savedAt} />
          {!adding && (
            <Button type="button" variant="secondary" onClick={() => setOpenedAt(Date.now())} className="px-4 text-body-sm">
              <IconPlus size={18} /> 일정 추가
            </Button>
          )}
        </div>
      </div>
      {adding && (
        <ScheduleForm action={action} state={state} pending={pending} today={today} onCancel={() => setOpenedAt(null)} />
      )}
      {schedules.length > 0 && (
        <ul className="divide-y divide-line/70 rounded-card border border-line/70 bg-surface shadow-soft">
          {schedules.map((s) => (
            <ScheduleRow key={s.id} schedule={s} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ScheduleRow({ schedule, today }: { schedule: ScheduleItem; today: string }) {
  const [state, action, pending] = useActionState<FormState<ScheduleField>, FormData>(saveSchedule, {});
  const [del, delAction, deleting] = useActionState<FormState<never>, FormData>(removeSchedule, {});
  const [editAt, setEditAt] = useState<number | null>(null);
  const editing = editAt !== null && !(state.savedAt && state.savedAt > editAt);

  if (editing) {
    return (
      <li className="p-2">
        <ScheduleForm
          action={action}
          state={state}
          pending={pending}
          today={today}
          initial={schedule}
          onCancel={() => setEditAt(null)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2 pr-2 pl-4">
      <span className="w-14 shrink-0 font-display text-title text-brand-deep">
        {dDayLabel(daysBetween(today, schedule.startDate))}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{schedule.ward}</p>
        <p className="truncate text-body-sm text-ink-soft">
          {schedule.hospital} · {shortDate(schedule.startDate)}
          {schedule.endDate && ` ~ ${shortDate(schedule.endDate)}`}
        </p>
      </div>
      <FormStatus message={del.message} />
      <FormStatus savedAt={state.savedAt} />
      <RowActions id={schedule.id} onEdit={() => setEditAt(Date.now())} deleteAction={delAction} deleting={deleting} />
    </li>
  );
}

function ScheduleForm({
  action,
  state,
  pending,
  today,
  initial,
  onCancel,
}: {
  action: (formData: FormData) => void;
  state: FormState<ScheduleField>;
  pending: boolean;
  today: string;
  initial?: ScheduleItem;
  onCancel: () => void;
}) {
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  // 같은 화면에 폼이 여러 개 있을 수 있어 id가 겹치지 않게 접두어를 붙인다
  const p = initial ? `s-${initial.id}-` : "s-new-";
  return (
    <form action={action} noValidate className="space-y-3 rounded-card border border-line/70 bg-surface p-4 shadow-soft">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${p}hospital`}
          name="hospital"
          label="병원"
          placeholder="예: 한빛대학교병원"
          defaultValue={v?.hospital ?? initial?.hospital}
          error={errors.hospital}
        />
        <Field
          id={`${p}ward`}
          name="ward"
          label="병동"
          placeholder="예: 내과병동"
          defaultValue={v?.ward ?? initial?.ward}
          error={errors.ward}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id={`${p}startDate`}
          name="startDate"
          label="시작일"
          type="date"
          defaultValue={v?.startDate ?? initial?.startDate ?? today}
          error={errors.startDate}
        />
        <Field
          id={`${p}endDate`}
          name="endDate"
          label="종료일 (선택)"
          type="date"
          defaultValue={v?.endDate ?? initial?.endDate ?? ""}
          error={errors.endDate}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id={`${p}subject`}
          name="subject"
          label="실습 과목 (선택)"
          defaultValue={v?.subject ?? initial?.subject ?? ""}
          error={errors.subject}
        >
          <option value="">선택 안 함</option>
          {SUBJECTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SelectField>
        <Field
          id={`${p}department`}
          name="department"
          label="진료과 (선택)"
          placeholder="예: 소화기내과"
          defaultValue={v?.department ?? initial?.department ?? ""}
          error={errors.department}
        />
      </div>
      {/* 병동 정보는 접어 두고, 오류가 있거나 이미 적어 둔 값이 있으면 펼친다 */}
      <details
        open={DETAIL_FIELDS.some((f) => errors[f]) || (initial ? hasDetails(initial) : false)}
        className="rounded-control bg-subtle p-3"
      >
        <summary className="min-h-11 cursor-pointer content-center text-body-sm font-bold text-ink">
          병동 정보 더 입력하기 (근무 시간 · 집결 · 수간호사 · 질환 · 조원)
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <SelectField id={`${p}shift`} name="shift" label="듀티" defaultValue={v?.shift ?? initial?.shift ?? ""} error={errors.shift}>
              <option value="">-</option>
              {SHIFTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </SelectField>
            <Field
              id={`${p}shiftStart`}
              name="shiftStart"
              label="시작"
              type="time"
              defaultValue={v?.shiftStart ?? initial?.shiftStart ?? ""}
              error={errors.shiftStart}
            />
            <Field
              id={`${p}shiftEnd`}
              name="shiftEnd"
              label="끝"
              type="time"
              defaultValue={v?.shiftEnd ?? initial?.shiftEnd ?? ""}
              error={errors.shiftEnd}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field
              id={`${p}meetingPlace`}
              name="meetingPlace"
              label="집결 장소"
              placeholder="예: 본관 7층 엘리베이터 앞"
              defaultValue={v?.meetingPlace ?? initial?.meetingPlace ?? ""}
              error={errors.meetingPlace}
            />
            <Field
              id={`${p}meetingTime`}
              name="meetingTime"
              label="집결 시각"
              type="time"
              defaultValue={v?.meetingTime ?? initial?.meetingTime ?? ""}
              error={errors.meetingTime}
            />
          </div>
          <Field
            id={`${p}preceptor`}
            name="preceptor"
            label="담당 수간호사 (현장지도자)"
            placeholder="예: 박지영 수간호사"
            defaultValue={v?.preceptor ?? initial?.preceptor ?? ""}
            error={errors.preceptor}
          />
          <Field
            id={`${p}commonDiseases`}
            name="commonDiseases"
            label="주요 다빈도 질환 (쉼표로 구분)"
            placeholder="예: 간경변증, 위장관출혈, 급성췌장염"
            defaultValue={v?.commonDiseases ?? initial?.commonDiseases.join(", ") ?? ""}
            error={errors.commonDiseases}
          />
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <Field
              id={`${p}groupName`}
              name="groupName"
              label="조"
              placeholder="예: 3조"
              defaultValue={v?.groupName ?? initial?.groupName ?? ""}
              error={errors.groupName}
            />
            <Field
              id={`${p}teammates`}
              name="teammates"
              label="조원 (쉼표로 구분)"
              placeholder="예: 박소연, 정민수"
              defaultValue={v?.teammates ?? initial?.teammates.join(", ") ?? ""}
              error={errors.teammates}
            />
          </div>
        </div>
      </details>
      <FormStatus message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}

const DETAIL_FIELDS = [
  "shift",
  "shiftStart",
  "shiftEnd",
  "meetingPlace",
  "meetingTime",
  "preceptor",
  "commonDiseases",
  "groupName",
  "teammates",
] as const;

function hasDetails(s: ScheduleItem) {
  return Boolean(
    s.shift || s.shiftStart || s.shiftEnd || s.meetingPlace || s.meetingTime || s.preceptor || s.groupName || s.commonDiseases.length || s.teammates.length,
  );
}
