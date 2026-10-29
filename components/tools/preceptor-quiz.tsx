"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { evaluateAnswerAction, type PreceptorState } from "@/server/learning-actions";
import type { AttemptItem } from "@/server/learning-repo";
import { PASS_SCORE, PRECEPTOR_QUESTIONS, PRECEPTOR_WARDS, type PreceptorWard } from "@/lib/preceptor-questions";
import { wardCategoryLabel } from "@/lib/skills";
import { SPRING_SOFT } from "@/lib/motion";
import AnimatedNumber from "@/components/motion/animated-number";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import ChoiceChips from "@/components/ui/choice-chips";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import TextareaField from "@/components/ui/textarea-field";
import { WalkingTurtle } from "@/components/ui/skeleton";

// AI 프리셉터 모의 구술질문: 병동 고르기 → 질문 → 답변 → AI 평가(점수·잘한 점·보완점·모범 답안). 80점 미만은 오답노트
export default function PreceptorQuiz({ missed, left }: { missed: AttemptItem[]; left: number }) {
  const [ward, setWard] = useState<PreceptorWard>("internal");
  const [index, setIndex] = useState(0);
  // 같은 질문을 다시 풀거나 질문을 바꾸면 답변 칸·결과를 새로 시작 (key)
  const [round, setRound] = useState(0);
  const questions = PRECEPTOR_QUESTIONS[ward];
  const q = questions[index % questions.length];

  function pick(w: PreceptorWard, key?: string) {
    setWard(w);
    setIndex(
      key
        ? Math.max(
            0,
            PRECEPTOR_QUESTIONS[w].findIndex((x) => x.key === key),
          )
        : 0,
    );
    setRound((r) => r + 1);
  }

  return (
    <div className="space-y-4">
      <Card>
        <ChoiceChips
          key={`ward-${ward}`}
          name="wardPick"
          legend="실습 병동"
          options={PRECEPTOR_WARDS.map((w) => ({ key: w, label: wardCategoryLabel(w) }))}
          defaultValue={ward}
          onChange={(w) => pick(w as PreceptorWard)}
        />
      </Card>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${q.key}-${round}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SPRING_SOFT}
        >
          <QuestionCard
            ward={ward}
            questionKey={q.key}
            question={q.question}
            number={(index % questions.length) + 1}
            total={questions.length}
            left={left}
            onNext={() => {
              setIndex((i) => i + 1);
              setRound((r) => r + 1);
            }}
          />
        </motion.div>
      </AnimatePresence>

      <MissedNotes missed={missed} onRetry={(a) => pick(a.ward, a.questionKey)} />
    </div>
  );
}

function QuestionCard({
  ward,
  questionKey,
  question,
  number,
  total,
  left,
  onNext,
}: {
  ward: PreceptorWard;
  questionKey: string;
  question: string;
  number: number;
  total: number;
  left: number;
  onNext: () => void;
}) {
  const [state, action, pending] = useActionState<PreceptorState, FormData>(evaluateAnswerAction, {});
  const result = state.result;
  return (
    <Card data-preceptor-question={questionKey}>
      <div className="flex items-center justify-between gap-2">
        <Chip tone="neutral" className="text-caption">
          {wardCategoryLabel(ward)} 프리셉터 · 질문 {number}/{total}
        </Chip>
        <Chip tone="neutral" className="text-caption">
          AI 오늘 {left}회 남음
        </Chip>
      </div>
      <p className="mt-3 text-title font-bold text-ink">“{question}”</p>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="ward" value={ward} />
        <input type="hidden" name="questionKey" value={questionKey} />
        <TextareaField
          name="answer"
          label="내 답변 (학생간호사로서 행동·보고 순서대로)"
          rows={4}
          maxLength={1000}
          defaultValue={state.values?.answer}
          error={state.fieldErrors?.answer}
          placeholder="예: 먼저 환자 곁에서 의식과 맥박을 다시 확인하고, 바로 지도간호사 선생님께 보고하겠습니다…"
        />
        <FormStatus message={state.message} />
        {pending ? (
          <WalkingTurtle label="프리셉터가 답변을 듣고 있어요" />
        ) : (
          <div className="flex gap-2">
            <Button type="submit" disabled={left === 0} className="flex-1">
              {left === 0 ? "오늘은 다 썼어요" : result ? "다시 답하고 평가받기" : "답변 제출하고 평가받기"}
            </Button>
            <Button type="button" variant="ghost" onClick={onNext}>
              다른 질문 →
            </Button>
          </div>
        )}
      </form>
      {result && !pending && <EvalResult result={result} />}
    </Card>
  );
}

function EvalResult({ result }: { result: NonNullable<PreceptorState["result"]> }) {
  const pass = result.score >= PASS_SCORE;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SOFT}
      className="mt-4 space-y-3 border-t border-line/70 pt-4"
      data-preceptor-result
    >
      <div className="flex items-center gap-3">
        <AnimatedNumber
          value={result.score}
          suffix="점"
          format={{ maximumFractionDigits: 0 }}
          className={`font-display text-display ${pass ? "text-brand-deep" : "text-warn-ink"}`}
        />
        <Chip tone={pass ? "brand" : "warn"}>{pass ? "👍 잘 대응했어요" : "📒 오답노트에 담았어요"}</Chip>
      </div>
      {result.strengths.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-body-sm text-ink">
          {result.strengths.map((s, i) => (
            <li key={i}>👍 {s}</li>
          ))}
        </ul>
      )}
      {result.improvements.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-body-sm text-ink">
          {result.improvements.map((s, i) => (
            <li key={i}>✏️ {s}</li>
          ))}
        </ul>
      )}
      <div className="rounded-control bg-subtle px-4 py-3">
        <p className="text-body-sm font-bold text-ink">모범 답안 · 근거</p>
        <p className="mt-1 text-body-sm break-words whitespace-pre-line text-ink">{result.modelAnswer}</p>
      </div>
      <p className="text-caption text-ink-soft">학습용 참고예요. 실제 상황에서는 지도간호사 선생님의 지시를 따르세요.</p>
    </motion.div>
  );
}

function MissedNotes({ missed, onRetry }: { missed: AttemptItem[]; onRetry: (a: AttemptItem) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section aria-labelledby="missed-title" className="space-y-2">
      <h2 id="missed-title" className="text-title font-bold">
        📒 오답노트 <span className="text-body-sm font-medium text-ink-soft">({missed.length})</span>
      </h2>
      {missed.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-body-sm text-ink-soft shadow-soft">
          {PASS_SCORE}점 미만이었던 질문이 여기에 모여요. 다시 풀어 통과하면 빠져요.
        </p>
      ) : (
        <ul className="space-y-2">
          {missed.map((a) => (
            <li key={a.id} className="rounded-card border border-warn-line bg-surface p-4 shadow-soft" data-missed={a.questionKey}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink">{a.question}</p>
                <Chip tone="warn" className="shrink-0 text-caption">
                  {a.score}점
                </Chip>
              </div>
              <p className="mt-1 text-caption text-ink-soft">
                {wardCategoryLabel(a.ward)} · 내 답변: {a.answer.slice(0, 80)}
                {a.answer.length > 80 && "…"}
              </p>
              {open === a.id && (
                <p className="mt-2 rounded-control bg-subtle px-3 py-2 text-body-sm whitespace-pre-line text-ink">
                  {a.feedback.modelAnswer}
                </p>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(open === a.id ? null : a.id)}
                  className="min-h-11 px-3 text-body-sm"
                >
                  {open === a.id ? "모범 답안 접기" : "모범 답안 보기"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onRetry(a);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="min-h-11 px-4 text-body-sm"
                >
                  다시 풀기
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
