"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, updatePassword } from "@/server/password-actions";
import { resetWithCode, type CodeFormState } from "@/server/verify-actions";
import Collapse from "@/components/motion/collapse";
import CodeTimer from "@/components/auth/code-timer";
import { CODE_LENGTH } from "@/lib/auth-code";
import type { ResetFormState } from "@/lib/validation/auth";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";

function Message({ state }: { state: ResetFormState | CodeFormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-control px-4 py-3 text-body-sm font-medium ${
        state.status === "error" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-deep"
      }`}
    >
      {state.message}
    </p>
  );
}

export function RequestResetForm({ onSent }: { onSent: () => void }) {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(async (prev: ResetFormState, formData: FormData) => {
    const next = await requestPasswordReset(prev, formData);
    if (next.sent) onSent();
    return next;
  }, {});
  return (
    <form action={action} noValidate className="space-y-4">
      <Field
        name="email"
        label="가입한 이메일"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Message state={state} />
      <Button type="submit" block variant={state.sent ? "secondary" : "primary"} disabled={pending}>
        {pending ? "보내는 중..." : state.sent ? "인증 코드 다시 받기" : "인증 코드 받기"}
      </Button>
    </form>
  );
}

/** 2단계: 메일로 받은 코드 + 새 비밀번호 */
export function CodeResetForm({ sentAt }: { sentAt: number | null }) {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(resetWithCode, {});
  return (
    <form action={action} noValidate className="space-y-4 border-t border-line/70 pt-5">
      <Field
        name="code"
        label="메일로 받은 인증 코드"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        placeholder={`숫자 ${CODE_LENGTH}자리`}
        error={state.fieldErrors?.code}
      />
      <CodeTimer sentAt={sentAt} />
      <p className="text-caption text-ink-soft">메일이 안 보이면 스팸함(정크메일함)도 확인해 주세요.</p>
      <Field name="password" label="새 비밀번호 (8자 이상)" type="password" autoComplete="new-password" error={state.fieldErrors?.password} />
      <Field name="confirm" label="새 비밀번호 확인" type="password" autoComplete="new-password" error={state.fieldErrors?.confirm} />
      <Message state={state} />
      <Button type="submit" block disabled={pending}>
        {pending ? "바꾸는 중..." : "비밀번호 바꾸기"}
      </Button>
    </form>
  );
}

/** 재설정 화면: 이메일 → (보낸 뒤) 코드·새 비밀번호가 아래로 펼쳐진다 */
export function ResetFlow() {
  // 마지막으로 코드를 보낸 시각 (다시 받으면 남은 시간이 10분부터 다시)
  const [sentAt, setSentAt] = useState<number | null>(null);
  return (
    <div className="space-y-5">
      <RequestResetForm onSent={() => setSentAt(Date.now())} />
      <Collapse open={sentAt !== null}>
        <CodeResetForm sentAt={sentAt} />
      </Collapse>
    </div>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(updatePassword, {});
  return (
    <form action={action} noValidate className="space-y-4">
      <Field name="password" label="새 비밀번호 (8자 이상)" type="password" autoComplete="new-password" error={state.fieldErrors?.password} />
      <Field name="confirm" label="새 비밀번호 확인" type="password" autoComplete="new-password" error={state.fieldErrors?.confirm} />
      <Message state={state} />
      <Button type="submit" block disabled={pending}>
        {pending ? "바꾸는 중..." : "비밀번호 바꾸기"}
      </Button>
    </form>
  );
}
