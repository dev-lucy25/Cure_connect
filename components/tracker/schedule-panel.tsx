"use client";

import { useActionState, useState } from "react";
import { removeSchedule, saveSchedule } from "@/server/practice-actions";
import type { FormState, ScheduleField } from "@/lib/validation/practice";
import type { ScheduleItem } from "@/server/practice-repo";
import { dDayLabel, daysBetween, shortDate } from "@/lib/dates";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
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
      <span className="w-14 shrink-0 font-display text-title text-mint-deep">
        {dDayLabel(daysBetween(today, schedule.startDate))}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{schedule.ward}</p>
        <p className="truncate text-body-sm text-ink-soft">
          {schedule.hospital} · {shortDate(schedule.startDate)}
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
      <Field
        id={`${p}startDate`}
        name="startDate"
        label="시작일"
        type="date"
        min={today}
        defaultValue={v?.startDate ?? initial?.startDate ?? today}
        error={errors.startDate}
      />
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
