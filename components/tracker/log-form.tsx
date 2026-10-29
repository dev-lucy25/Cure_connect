"use client";

import { useState } from "react";
import type { FormState, LogField } from "@/lib/validation/practice";
import type { LogItem } from "@/server/practice-repo";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { SHIFTS, SUBJECTS } from "@/lib/subjects";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import SelectField from "@/components/ui/select-field";
import TextareaField from "@/components/ui/textarea-field";

const HOUR_PRESETS = [
  { hours: "8", label: "8시간 (1일)" },
  { hours: "9", label: "9시간" },
  { hours: "4", label: "4시간 (반일)" },
];

// 일지 쓰기·고치기 공용 폼. 저장 처리(useActionState)는 부모가 들고 있다.
export default function LogForm({
  action,
  state,
  pending,
  today,
  initial,
  onCancel,
}: {
  action: (formData: FormData) => void;
  state: FormState<LogField>;
  pending: boolean;
  today: string;
  initial?: LogItem;
  onCancel: () => void;
}) {
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  // 한 일 칸은 입력하는 동안 환자 식별 정보를 바로 안내하려고 직접 상태로 관리한다
  const [activities, setActivities] = useState(v?.activities ?? initial?.activities ?? "");
  const pii = detectPii(activities);
  // 시간은 빠른 선택 버튼으로도 채우므로 직접 상태로 관리한다
  const [hours, setHours] = useState(String(v?.hours ?? initial?.hours ?? 8));
  const p = initial ? `l-${initial.id}-` : "l-new-";

  return (
    <form action={action} noValidate className="space-y-3 rounded-card border border-line/70 bg-surface p-4 shadow-soft">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Field
          id={`${p}date`}
          name="date"
          label="날짜"
          type="date"
          max={today}
          defaultValue={v?.date ?? initial?.date ?? today}
          error={errors.date}
        />
        <Field
          id={`${p}hours`}
          name="hours"
          label="실습 시간"
          type="number"
          inputMode="decimal"
          min={0.5}
          max={24}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          error={errors.hours}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="실습 시간 빠른 선택">
        {HOUR_PRESETS.map((preset) => (
          <button
            key={preset.hours}
            type="button"
            aria-pressed={hours === preset.hours}
            onClick={() => setHours(preset.hours)}
            className={`press min-h-11 rounded-full px-4 text-body-sm font-bold ${
              hours === preset.hours ? "bg-brand text-ink" : "bg-subtle text-ink-soft hover:text-ink"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField id={`${p}subject`} name="subject" label="실습 과목" defaultValue={v?.subject ?? initial?.subject ?? ""} error={errors.subject}>
          <option value="" disabled>
            과목 선택
          </option>
          {SUBJECTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SelectField>
        <SelectField id={`${p}shift`} name="shift" label="듀티 (선택)" defaultValue={v?.shift ?? initial?.shift ?? ""} error={errors.shift}>
          <option value="">선택 안 함</option>
          {SHIFTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SelectField>
      </div>
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
          placeholder="예: 71병동 (내과)"
          defaultValue={v?.ward ?? initial?.ward}
          error={errors.ward}
        />
      </div>
      <TextareaField
        id={`${p}activities`}
        name="activities"
        label="한 일"
        placeholder="예: V/S 측정, I/O 체크, 투약 참관"
        maxLength={2000}
        value={activities}
        onChange={(e) => setActivities(e.target.value)}
        hint={pii.length > 0 && !errors.activities ? `⚠️ ${piiMessage(pii)}` : undefined}
        error={errors.activities}
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
