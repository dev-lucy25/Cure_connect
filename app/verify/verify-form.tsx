"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { resendSignupCode, verifySignupCode, type CodeFormState } from "@/server/verify-actions";
import { CODE_LENGTH, RESEND_WAIT_MS } from "@/lib/auth-code";
import CodeTimer, { useRemaining } from "@/components/auth/code-timer";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";

// 코드 입력 + 남은 시간(10분) + 다시 받기(60초 간격). 맞으면 서버가 홈으로 보낸다
export default function VerifyForm({ sentAt }: { sentAt: number | null }) {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(verifySignupCode, {});
  const [resend, setResend] = useState<CodeFormState>({});
  const [sending, startSending] = useTransition();
  // 다시 받으면 남은 시간·다시 받기 대기가 그때부터 새로 시작
  const lastSent = resend.resentAt ?? sentAt;
  const left = Math.ceil((useRemaining(lastSent, RESEND_WAIT_MS) ?? 0) / 1000);

  return (
    <div className="space-y-4">
      <form action={action} noValidate className="space-y-4">
        <Field
          name="code"
          label="인증 코드"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          placeholder={`숫자 ${CODE_LENGTH}자리`}
          autoFocus
          error={state.fieldErrors?.code}
        />
        <CodeTimer sentAt={lastSent} />
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
      <p className="text-caption text-ink-soft">메일이 안 보이면 스팸함(정크메일함)도 확인해 주세요. 보내는 사람: NursePass</p>
    </div>
  );
}
