"use client";

import { useState } from "react";
import type { FormState, LogField } from "@/lib/validation/practice";
import type { LogItem } from "@/server/practice-repo";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import TextareaField from "@/components/ui/textarea-field";

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
          defaultValue={v?.hours ?? initial?.hours ?? 8}
          error={errors.hours}
        />
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
