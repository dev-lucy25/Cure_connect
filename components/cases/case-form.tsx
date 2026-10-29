"use client";

import { useState } from "react";
import type { FormState } from "@/lib/validation/form";
import { MEMO_MAX, type CaseField } from "@/lib/validation/case";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import TextareaField from "@/components/ui/textarea-field";

// 케이스 쓰기·고치기 공용 폼. 저장 처리(useActionState)는 부모가 들고 있다.
export default function CaseForm({
  action,
  state,
  pending,
  initial,
  onCancel,
  submitLabel = "저장",
}: {
  action: (formData: FormData) => void;
  state: FormState<CaseField>;
  pending: boolean;
  initial?: { id: string; title: string; ward: string; memo: string };
  onCancel: () => void;
  submitLabel?: string;
}) {
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  // 메모는 글자 수와 환자 식별 정보를 입력하는 동안 바로 보여주려고 직접 상태로 관리한다
  const [memo, setMemo] = useState(v?.memo ?? initial?.memo ?? "");
  const pii = detectPii(memo);

  return (
    <form action={action} noValidate className="space-y-3 rounded-card border border-line/70 bg-surface p-4 shadow-soft">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="case-title"
          name="title"
          label="제목"
          placeholder="예: 폐렴 환자 호흡 간호"
          maxLength={60}
          defaultValue={v?.title ?? initial?.title}
          error={errors.title}
        />
        <Field
          id="case-ward"
          name="ward"
          label="병동"
          placeholder="예: 71병동 (내과)"
          maxLength={60}
          defaultValue={v?.ward ?? initial?.ward}
          error={errors.ward}
        />
      </div>
      <TextareaField
        id="case-memo"
        name="memo"
        label="현장 메모"
        placeholder={"예: 68세 남, 폐렴 입원 3일차. 기침·가래 많음, 밤에 숨참 호소.\nBP 138/86, HR 104, BT 38.2, SpO2 92"}
        rows={8}
        maxLength={MEMO_MAX}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        hint={pii.length > 0 && !errors.memo ? `⚠️ ${piiMessage(pii)}` : undefined}
        error={errors.memo}
      />
      <p className="-mt-2 text-right text-caption text-ink-soft">
        {memo.length.toLocaleString("ko-KR")} / {MEMO_MAX.toLocaleString("ko-KR")}자
      </p>
      <FormStatus message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "저장 중..." : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
