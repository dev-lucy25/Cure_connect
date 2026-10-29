"use client";

import { useActionState, useState } from "react";
import { askCaseAction } from "@/server/case-actions";
import type { FormState } from "@/lib/validation/form";
import type { ChatMessage } from "@/server/case-repo";
import { QUESTION_MAX } from "@/lib/validation/case";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import { WalkingTurtle } from "@/components/ui/skeleton";

const SUGGESTIONS = ["간호진단을 더 추천해 줘", "빠진 사정 항목은 어떻게 확인해?", "중재를 근거와 함께 설명해 줘"];

// 케이스별 AI 대화. 답을 기다리는 동안 이 카드 안에서만 거북이가 걷는다 (화면의 다른 곳은 그대로 쓸 수 있다)
export default function CaseChat({
  caseId,
  messages,
  usedToday,
  limit,
}: {
  caseId: string;
  messages: ChatMessage[];
  usedToday: number;
  limit: number;
}) {
  const [state, action, pending] = useActionState<FormState<"question">, FormData>(askCaseAction, {});
  const [question, setQuestion] = useState(state.values?.question ?? "");
  const [sending, setSending] = useState("");
  const [clearedAt, setClearedAt] = useState<number | undefined>(undefined);
  const left = Math.max(0, limit - usedToday);
  const pii = detectPii(question);

  // 답을 저장하면 입력칸을 비운다 (렌더 중 이전 값과 비교, effect 없이)
  if (state.savedAt && state.savedAt !== clearedAt) {
    setClearedAt(state.savedAt);
    setQuestion("");
  }

  return (
    <Card aria-labelledby="chat-title" aria-busy={pending}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="chat-title" className="text-title font-bold">
          AI에게 질문
        </h2>
        <Chip tone="neutral">
          오늘 {left}/{limit}회 남음
        </Chip>
      </div>
      <p className="mt-1 text-body-sm text-ink-soft">이 케이스의 메모를 바탕으로 답해요</p>

      <ol aria-live="polite" className="mt-4 space-y-3">
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {pending && (
          <>
            <Bubble role="user" content={sending} />
            <li className="rounded-card bg-subtle px-4 py-2">
              <WalkingTurtle label="답을 생각하고 있어요" />
            </li>
          </>
        )}
      </ol>

      {messages.length === 0 && !pending && (
        <div className="mt-1 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuestion(s)}
              className="press min-h-11 rounded-full border border-line bg-surface px-3.5 text-body-sm font-bold text-ink-soft hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form action={action} onSubmit={() => setSending(question)} noValidate className="mt-4 space-y-2">
        <input type="hidden" name="id" value={caseId} />
        <label htmlFor="case-question" className="sr-only">
          질문
        </label>
        <textarea
          id="case-question"
          name="question"
          rows={2}
          maxLength={QUESTION_MAX}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="예: 이 환자에게 맞는 간호진단이 뭐가 있을까?"
          aria-invalid={Boolean(state.fieldErrors?.question)}
          aria-describedby="case-question-help"
          className="w-full resize-none rounded-control border border-line bg-surface px-4 py-3 text-body text-ink outline-none placeholder:text-ink-soft/70 focus:border-brand-deep"
        />
        <div id="case-question-help" className="space-y-1">
          {pii.length > 0 && !state.fieldErrors?.question && (
            <p className="text-body-sm font-medium text-pink-deep">⚠️ {piiMessage(pii)}</p>
          )}
          {state.fieldErrors?.question && <p className="text-body-sm font-medium text-danger">{state.fieldErrors.question}</p>}
          <p className="text-right text-caption text-ink-soft">
            {question.length} / {QUESTION_MAX}자
          </p>
        </div>
        <FormStatus message={state.message} />
        <FormStatus savedAt={state.savedAt} savedText="답을 받았어요 🐢" />
        <Button type="submit" block disabled={pending || left === 0 || question.trim() === ""}>
          {pending ? "답을 기다리는 중..." : left === 0 ? "오늘은 다 썼어요" : "보내기"}
        </Button>
      </form>
    </Card>
  );
}

function Bubble({ role, content }: { role: "user" | "ai"; content: string }) {
  if (role === "user") {
    return (
      <li className="ml-10 rounded-card rounded-br-md bg-brand-soft px-4 py-3 text-body whitespace-pre-line break-words text-ink">
        {content}
      </li>
    );
  }
  return (
    <li className="mr-6">
      <div className="rounded-card rounded-bl-md bg-subtle px-4 py-3 text-body whitespace-pre-line break-words text-ink">{content}</div>
      <p className="mt-1 pl-1 text-caption text-pink-deep">참고용 — 직접 확인하세요</p>
    </li>
  );
}
