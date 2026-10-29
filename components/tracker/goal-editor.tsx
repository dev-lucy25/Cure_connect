"use client";

import { useActionState, useState } from "react";
import { saveGoal } from "@/server/practice-actions";
import type { FormState } from "@/lib/validation/practice";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";

export default function GoalEditor({ goalHours }: { goalHours: number }) {
  const [state, action, pending] = useActionState<FormState<"goalHours">, FormData>(saveGoal, {});
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  // 연 뒤에 저장이 성공하면 닫힌 상태로 본다
  const open = openedAt !== null && !(state.savedAt && state.savedAt > openedAt);

  if (!open) {
    return (
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/70 pt-2">
        <FormStatus savedAt={state.savedAt} savedText="목표를 바꿨어요" />
        <button
          type="button"
          onClick={() => setOpenedAt(Date.now())}
          className="ml-auto min-h-11 whitespace-nowrap text-body-sm font-bold text-brand-deep hover:underline"
        >
          목표 시간 바꾸기
        </button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="mt-4 space-y-3 border-t border-line/70 pt-4">
      <Field
        name="goalHours"
        label="목표 실습 시간 (100~3000시간)"
        type="number"
        inputMode="numeric"
        min={100}
        max={3000}
        step={10}
        defaultValue={state.values?.goalHours ?? goalHours}
        error={state.fieldErrors?.goalHours}
      />
      <FormStatus message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpenedAt(null)}>
          취소
        </Button>
      </div>
    </form>
  );
}
