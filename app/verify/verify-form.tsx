"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { resendSignupCode, verifySignupCode, type CodeFormState } from "@/server/verify-actions";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";

const RESEND_WAIT_S = 60;

// 코드 입력 + 다시 받기(60초 기다림). 맞으면 서버가 홈으로 보낸다
export default function VerifyForm() {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(verifySignupCode, {});
  const [resend, setResend] = useState<CodeFormState>({});
  const [sending, startSending] = useTransition();
  const left = useCountdown(resend.resentAt);

  return (
    <div className="space-y-4">
      <form action={action} noValidate className="space-y-4">
        <Field
          name="code"
          label="인증 코드"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          placeholder="숫자 6자리"
          autoFocus
          error={state.fieldErrors?.code}
        />
        <FormStatus message={state.message} />
        <Button type="submit" block disabled={pending}>
          {pending ? "확인 중..." : "인증하고 시작하기"}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3 text-body-sm">
        <button
          type="button"
          disabled={sending || left > 0}
          onClick={() => startSending(async () => setResend(await resendSignupCode()))}
          className="inline-flex min-h-11 items-center font-bold text-brand-deep hover:underline disabled:text-ink-soft disabled:no-underline"
        >
          {sending ? "보내는 중..." : left > 0 ? `코드 다시 받기 (${left}초)` : "코드 다시 받기"}
        </button>
        <Link href="/login" className="inline-flex min-h-11 items-center text-ink-soft hover:text-ink">
          다른 이메일로 가입하기
        </Link>
      </div>
      <FormStatus
        message={resend.status === "error" ? resend.message : undefined}
        savedAt={resend.resentAt}
        savedText="새 인증 코드를 보냈어요 📮"
      />
    </div>
  );
}

/** 다시 받기 누른 뒤 남은 초 */
function useCountdown(since: number | undefined) {
  const [now, setNow] = useState(() => since ?? 0);
  useEffect(() => {
    if (!since) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);
  if (!since) return 0;
  return Math.max(0, RESEND_WAIT_S - Math.floor((Math.max(now, since) - since) / 1000));
}
