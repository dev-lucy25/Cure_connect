"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "@/server/password-actions";
import type { ResetFormState } from "@/lib/validation/auth";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";

function Message({ state }: { state: ResetFormState }) {
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

export function RequestResetForm() {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(requestPasswordReset, {});
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
      <Button type="submit" block disabled={pending}>
        {pending ? "보내는 중..." : "재설정 링크 받기"}
      </Button>
    </form>
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
