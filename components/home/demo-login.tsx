"use client";

import { useState, useTransition } from "react";
import { demoLogin } from "@/server/demo-actions";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo";
import Button from "@/components/ui/button";
import FormStatus from "@/components/ui/form-status";

// 로그인 화면 아래 "1초 체험" (DEMO_LOGIN_ENABLED일 때만 서버가 보여 준다)
export function DemoLoginCard() {
  const [busy, startBusy] = useTransition();
  const [which, setWhich] = useState<DemoRole | null>(null);
  const [message, setMessage] = useState<string>();
  function go(role: DemoRole) {
    setWhich(role);
    startBusy(async () => setMessage((await demoLogin(role))?.message));
  }
  return (
    <section
      aria-label="1초 체험"
      className="mt-4 rounded-card border border-dashed border-brand-deep/40 bg-brand-soft/40 p-4"
      data-demo-login
    >
      <p className="text-body-sm font-bold text-ink">⚡ 1초 체험 (심사·시연용)</p>
      <p className="mt-0.5 text-caption text-ink-soft">가짜 체험 계정으로 바로 들어가요. 학생·교수 화면을 오갈 수 있어요.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((role) => (
          <Button
            key={role}
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => go(role)}
            className="min-h-12 flex-col gap-0 px-3 py-1.5"
          >
            <span className="text-body-sm font-bold">{busy && which === role ? "들어가는 중..." : DEMO_ACCOUNTS[role].label}</span>
            <span className="text-caption font-medium opacity-80">{DEMO_ACCOUNTS[role].who}</span>
          </Button>
        ))}
      </div>
      <div className="mt-2">
        <FormStatus message={message} />
      </div>
    </section>
  );
}

// 체험 계정으로 로그인했을 때 맨 위 얇은 바: 학생 ↔ 교수 화면 바로 바꾸기
export function DemoRoleBar({ role }: { role: DemoRole }) {
  const [busy, startBusy] = useTransition();
  const other: DemoRole = role === "student" ? "professor" : "student";
  return (
    <div className="flex items-center justify-center gap-2 bg-ink px-4 py-1.5 text-caption text-canvas" data-demo-bar>
      <span>🎬 체험 모드 · {DEMO_ACCOUNTS[role].who}</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => startBusy(async () => void (await demoLogin(other)))}
        className="inline-flex min-h-8 items-center rounded-full bg-canvas/15 px-3 font-bold hover:bg-canvas/25 disabled:opacity-60"
      >
        {busy ? "바꾸는 중..." : other === "professor" ? "교수 화면으로 →" : "학생 화면으로 →"}
      </button>
    </div>
  );
}
