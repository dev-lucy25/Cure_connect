"use client";

import { useActionState, useState } from "react";
import { login, signup } from "@/server/auth-actions";
import type { AuthFormState } from "@/lib/validation/auth";
import NurseTurtle, { type TurtleMood } from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Field from "@/components/ui/field";

type Mode = "login" | "signup";

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <>
      <div role="tablist" aria-label="로그인 또는 회원가입" className="mb-3 grid grid-cols-2 rounded-full bg-subtle p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-(--size-touch) rounded-full text-body-sm font-bold transition ${
              mode === m ? "bg-brand text-ink" : "text-ink-soft"
            }`}
          >
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>
      {/* key로 모드마다 폼 상태를 새로 시작한다 */}
      {mode === "login" ? <Form key="login" mode="login" /> : <Form key="signup" mode="signup" />}
    </>
  );
}

function moodOf(state: AuthFormState, pending: boolean): TurtleMood {
  if (pending) return "loading";
  if (state.status === "error" || state.fieldErrors) return "error";
  if (state.status === "info") return "saved";
  return "default";
}

function Form({ mode }: { mode: Mode }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(mode === "login" ? login : signup, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <NurseTurtle stage={2} mood={moodOf(state, pending)} size={112} decorative />
        <h1 className="mt-1 font-display text-headline text-ink">NursePass</h1>
        <p className="mt-1 text-body-sm text-ink-soft">
          {mode === "login" ? "간호학과 임상실습 기록" : "계정을 만들고 기록을 시작하세요"}
        </p>
      </div>

      <form action={action} noValidate className="mt-6 space-y-4">
        {mode === "signup" && (
          <Field name="name" label="이름" autoComplete="name" defaultValue={state.values?.name} error={errors.name} />
        )}
        <Field
          name="email"
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          error={errors.email}
        />
        <Field
          name="password"
          label="비밀번호"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          error={errors.password}
        />

        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`rounded-control px-4 py-3 text-body-sm font-medium ${
              state.status === "error" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-deep"
            }`}
          >
            {state.message}
          </p>
        )}

        {/* pending 동안 비활성화해서 연타해도 한 번만 전송된다 */}
        <Button type="submit" block disabled={pending}>
          {pending ? "잠시만요..." : mode === "login" ? "로그인" : "가입하기"}
        </Button>
      </form>
    </Card>
  );
}
