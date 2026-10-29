"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import Collapse from "@/components/motion/collapse";
import { login, signup } from "@/server/auth-actions";
import type { AuthFormState } from "@/lib/validation/auth";
import type { OrgOption } from "@/server/org-repo";
import NurseTurtle, { type TurtleMood } from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Field from "@/components/ui/field";
import SelectField from "@/components/ui/select-field";

type Mode = "login" | "signup";
type Role = "student" | "professor";

export default function AuthForm({ orgs }: { orgs: OrgOption[] }) {
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
            className={`relative isolate min-h-(--size-touch) rounded-full text-body-sm font-bold transition-colors ${
              mode === m ? "text-ink" : "text-ink-soft"
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="auth-mode-pill"
                transition={SPRING_SNAPPY}
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-brand"
              />
            )}
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>
      {/* key로 모드마다 폼 상태를 새로 시작한다. 바뀔 때 이전 폼이 사라진 뒤 새 폼이 떠오른다 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SPRING_SOFT}
        >
          {mode === "login" ? <LoginForm orgs={orgs} /> : <SignupForm orgs={orgs} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function moodOf(state: AuthFormState, pending: boolean): TurtleMood {
  if (pending) return "loading";
  if (state.status === "error" || state.fieldErrors) return "error";
  if (state.status === "info") return "saved";
  return "default";
}

function FormHeader({ state, pending, subtitle }: { state: AuthFormState; pending: boolean; subtitle: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <NurseTurtle stage={2} mood={moodOf(state, pending)} size={112} decorative />
      <h1 className="mt-1 font-display text-headline text-ink">NursePass</h1>
      <p className="mt-1 text-body-sm text-ink-soft">{subtitle}</p>
    </div>
  );
}

function Message({ state }: { state: AuthFormState }) {
  if (!state.message) return null;
  return (
    <motion.p
      key={state.message}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SNAPPY}
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-control px-4 py-3 text-body-sm font-medium ${
        state.status === "error" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-deep"
      }`}
    >
      {state.message}
    </motion.p>
  );
}

/** 두세 개 중 하나를 고르는 알약 버튼 (라디오라서 폼 값으로 그대로 전송된다) */
function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
}) {
  // 같은 화면에 고르기 묶음이 여러 개일 수 있어 묶음마다 다른 layoutId를 쓴다
  const pillId = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 block text-body-sm font-bold text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-control bg-subtle p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={`relative isolate flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] px-2 text-center text-body-sm font-bold transition-colors has-focus-visible:outline-3 has-focus-visible:outline-brand-deep ${
              value === o.value ? "text-brand-deep" : "text-ink-soft"
            }`}
          >
            {value === o.value && (
              <motion.span
                layoutId={pillId}
                transition={SPRING_SNAPPY}
                aria-hidden
                className="absolute inset-0 -z-10 rounded-[10px] bg-surface shadow-soft"
              />
            )}
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-body-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "student", label: "간호학과 학생" },
  { value: "professor", label: "실습 지도교수 / 조교" },
];

function OrgSelect({
  orgs,
  value,
  onChange,
  error,
  noneLabel,
}: {
  orgs: OrgOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  noneLabel: string;
}) {
  return (
    <SelectField name="orgId" label="소속 학교 / 기관" value={value} onChange={(e) => onChange(e.target.value)} error={error}>
      <option value="">{noneLabel}</option>
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name} ({o.shortName})
        </option>
      ))}
    </SelectField>
  );
}

function LoginForm({ orgs }: { orgs: OrgOption[] }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, {});
  const [method, setMethod] = useState<"email" | "member">("email");
  const [role, setRole] = useState<Role>("student");
  const [orgId, setOrgId] = useState("");
  const errors = state.fieldErrors ?? {};
  const noLabel = role === "professor" ? "교번" : "학번";

  return (
    <Card>
      <FormHeader state={state} pending={pending} subtitle="학번 또는 이메일로 로그인하세요" />

      <form action={action} noValidate className="mt-6 space-y-4">
        <Segmented
          name="method"
          legend="로그인 방법"
          value={method}
          onChange={setMethod}
          options={[
            { value: "email", label: "이메일" },
            { value: "member", label: "학번 / 교번" },
          ]}
        />

        {/* 로그인 방법을 바꾸면 해당 칸이 부드럽게 접히고 펼쳐진다 */}
        <Collapse open={method === "member"} className="-mx-1 px-1">
          <div className="space-y-4 py-1">
            <Segmented name="role" legend="나는" value={role} onChange={setRole} options={ROLE_OPTIONS} />
            <OrgSelect orgs={orgs} value={orgId} onChange={setOrgId} error={errors.orgId} noneLabel="학교를 골라 주세요" />
            <Field
              name="memberNo"
              label={noLabel}
              autoComplete="username"
              placeholder={`${noLabel} 입력`}
              defaultValue={state.values?.memberNo}
              error={errors.memberNo}
            />
          </div>
        </Collapse>
        <Collapse open={method === "email"} className="-mx-1 px-1">
          <div className="py-1">
            <Field
              name="email"
              label="이메일"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={state.values?.email}
              error={errors.email}
            />
          </div>
        </Collapse>
        <Field name="password" label="비밀번호" type="password" autoComplete="current-password" error={errors.password} />

        <Message state={state} />

        {/* pending 동안 비활성화해서 연타해도 한 번만 전송된다 */}
        <Button type="submit" block disabled={pending}>
          {pending ? "잠시만요..." : "로그인"}
        </Button>
        <p className="text-center">
          <Link href="/reset-password" className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink">
            비밀번호를 잊었어요
          </Link>
        </p>
      </form>
    </Card>
  );
}

function SignupForm({ orgs }: { orgs: OrgOption[] }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signup, {});
  const [role, setRole] = useState<Role>("student");
  const [orgId, setOrgId] = useState("");
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const professor = role === "professor";

  return (
    <Card>
      <FormHeader state={state} pending={pending} subtitle="계정을 만들고 기록을 시작하세요" />

      <form action={action} noValidate className="mt-6 space-y-4">
        <Segmented name="role" legend="나는" value={role} onChange={setRole} options={ROLE_OPTIONS} error={errors.role} />
        <Field name="name" label="이름" autoComplete="name" defaultValue={values.name} error={errors.name} />
        <Field
          name="email"
          label="이메일"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={values.email}
          error={errors.email}
        />
        <Field name="password" label="비밀번호 (8자 이상)" type="password" autoComplete="new-password" error={errors.password} />

        <OrgSelect
          orgs={orgs}
          value={orgId}
          onChange={setOrgId}
          error={errors.orgId}
          noneLabel={professor ? "학교를 골라 주세요" : "학교 없이 개인으로 쓸게요"}
        />

        <Collapse open={Boolean(orgId)} className="-mx-1 px-1">
          <div className="py-1">
            <Field
              name="memberNo"
              label={professor ? "교번" : "학번"}
              autoComplete="username"
              defaultValue={values.memberNo}
              error={errors.memberNo}
            />
          </div>
        </Collapse>

        <Collapse open={professor} className="-mx-1 px-1">
          <div className="space-y-4 py-1">
            <Field
              name="staffTitle"
              label="직책 (선택)"
              placeholder="예: 실습과장, 조교"
              defaultValue={values.staffTitle}
              error={errors.staffTitle}
            />
            <Field
              name="inviteCode"
              label="학교 초대 코드"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="학과 사무실에서 받은 코드"
              defaultValue={values.inviteCode}
              error={errors.inviteCode}
            />
          </div>
        </Collapse>
        <Collapse open={!professor && Boolean(orgId)} className="-mx-1 px-1">
          <div className="grid grid-cols-2 gap-3 py-1">
            <SelectField name="grade" label="학년" defaultValue={values.grade ?? ""} error={errors.grade}>
              <option value="">선택</option>
              {[1, 2, 3, 4].map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </SelectField>
            <Field name="classGroup" label="반 (선택)" placeholder="예: B" defaultValue={values.classGroup} error={errors.classGroup} />
          </div>
        </Collapse>

        <Field
          name="roomCode"
          label={professor ? "실습반 방 코드 만들기 (선택)" : "실습반 방 코드 (선택)"}
          placeholder={professor ? "예: DIT-2026 · 학생들에게 알려 줄 코드" : "교수님께 받은 코드 · 예: DIT-2026"}
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={values.roomCode}
          error={errors.roomCode}
        />

        <Message state={state} />

        <Button type="submit" block disabled={pending}>
          {pending ? "잠시만요..." : "가입하기"}
        </Button>
      </form>
    </Card>
  );
}
