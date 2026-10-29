"use client";

import { useActionState, useEffect } from "react";
import { motion } from "motion/react";
import { editCaseAiAction, reviseCaseAction } from "@/server/case-actions";
import { AI_SECTIONS, QUICK_REVISIONS, type CaseAiResult } from "@/lib/validation/case";
import type { FormState } from "@/lib/validation/form";
import { SPRING_SOFT } from "@/lib/motion";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import TextareaField from "@/components/ui/textarea-field";
import { WalkingTurtle } from "@/components/ui/skeleton";

const SECTION_LABEL: Record<(typeof AI_SECTIONS)[number], string> = {
  S: "S 주관적 자료",
  O: "O 객관적 자료",
  A: "A 사정",
  P: "P 계획",
  I: "I 중재",
  E: "E 평가",
};

// 🪄 AI에게 수정 지시하기: 빠른 버튼 4개(데모 새 버전) 또는 직접 쓴 지시. 하루 AI 횟수에 포함된다
export function RevisePanel({ caseId, left }: { caseId: string; left: number }) {
  const [state, action, pending] = useActionState<FormState<"instruction">, FormData>(reviseCaseAction, {});
  const disabled = pending || left === 0;
  return (
    <form action={action} className="mt-4 space-y-3 rounded-card border border-brand/60 bg-brand-soft/50 p-4" data-revise-panel>
      <input type="hidden" name="id" value={caseId} />
      <p className="text-body-sm font-bold text-ink">🪄 AI에게 수정 지시하기</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_REVISIONS.map((q) => (
          <Button
            key={q.label}
            type="submit"
            name="instruction"
            value={q.instruction}
            variant="ghost"
            disabled={disabled}
            className="min-h-10 rounded-full border border-brand bg-surface px-3 text-caption font-bold text-brand-deep"
          >
            {q.label}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Field
            name="instruction"
            label="직접 지시 (선택)"
            placeholder="예: 1순위 진단을 '고체온'으로 바꾸고 미온수 마사지 중재를 넣어 줘"
            maxLength={200}
            defaultValue={
              state.values?.instruction && !QUICK_REVISIONS.some((q) => q.instruction === state.values?.instruction)
                ? state.values.instruction
                : ""
            }
            error={state.fieldErrors?.instruction}
          />
        </div>
        <Button type="submit" disabled={disabled} className="mt-7 shrink-0 px-4 text-body-sm">
          AI 수정 반영
        </Button>
      </div>
      {pending && <WalkingTurtle label="AI가 고치고 있어요" />}
      <FormStatus message={state.message} />
      <FormStatus savedAt={state.savedAt} savedText={state.notice} />
    </form>
  );
}

// ✏️ 직접 고치기: 항목마다 한 줄씩. 저장하면 정리 결과가 바뀐다(AI 횟수는 쓰지 않음)
export function AiEditForm({ caseId, ai, onDone }: { caseId: string; ai: CaseAiResult; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState<"edit">, FormData>(editCaseAiAction, {});
  useEffect(() => {
    if (state.savedAt) onDone();
  }, [state.savedAt, onDone]);
  // 진단은 지금 개수 + 빈 줄 1개 (최대 6)
  const rows = [
    ...ai.diagnoses,
    ...(ai.diagnoses.length < 6 ? [{ priority: ai.diagnoses.length + 1, name: "", relatedTo: "", domain: "" as const }] : []),
  ];

  return (
    <motion.form
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SOFT}
      action={action}
      className="mt-4 space-y-4"
      data-ai-edit
    >
      <input type="hidden" name="id" value={caseId} />
      <p className="rounded-control bg-subtle px-4 py-2.5 text-body-sm text-ink-soft">항목마다 한 줄씩 써 주세요. 빈 줄은 빠져요.</p>
      <Field name="title" label="제목" maxLength={60} defaultValue={ai.title} />
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-body-sm font-bold text-ink">NANDA-I 간호진단 (위에서부터 1순위)</legend>
        {rows.map((d, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
            <input type="hidden" name={`dx_domain_${i}`} value={d.domain} />
            <Field
              id={`dx-name-${i}`}
              name={`dx_name_${i}`}
              label={`${i + 1}순위 진단명`}
              maxLength={100}
              defaultValue={d.name}
              placeholder={i === ai.diagnoses.length ? "추가하려면 입력" : ""}
            />
            <Field id={`dx-related-${i}`} name={`dx_related_${i}`} label="관련요인" maxLength={200} defaultValue={d.relatedTo} />
          </div>
        ))}
      </fieldset>
      {AI_SECTIONS.map((k) => (
        <TextareaField key={k} name={k} label={SECTION_LABEL[k]} rows={Math.max(2, ai[k].length + 1)} defaultValue={ai[k].join("\n")} />
      ))}
      <TextareaField
        name="missingInfo"
        label="⚠️ 빠진 사정 항목"
        rows={Math.max(2, ai.missingInfo.length + 1)}
        defaultValue={ai.missingInfo.join("\n")}
      />
      <FormStatus message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "저장 중..." : "고친 내용 저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          취소
        </Button>
      </div>
    </motion.form>
  );
}
