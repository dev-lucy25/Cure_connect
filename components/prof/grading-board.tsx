"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GradingDetail, GradingRow } from "@/server/submission-repo";
import {
  gradeAction,
  gradingAiAction,
  loadGradingDetail,
  quickApproveAction,
} from "@/server/grading-actions";
import {
  GRADES,
  type GradeField,
  type GradingAi,
} from "@/lib/validation/grading";
import type { FormState } from "@/lib/validation/form";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import AiResultView from "@/components/cases/ai-result-view";
import SubmissionStatusChip from "@/components/cases/submission-status-chip";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import ChoiceChips from "@/components/ui/choice-chips";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import Modal from "@/components/ui/modal";
import TextareaField from "@/components/ui/textarea-field";
import { Bone, WalkingTurtle } from "@/components/ui/skeleton";
import {
  IconChat,
  IconPencil,
  IconSparkles,
  IconThumbUp,
} from "@/components/ui/icons";

type Row = GradingRow & { ago: string };
type Tab = "submitted" | "revision" | "graded" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "submitted", label: "채점 대기" },
  { key: "revision", label: "보완 요청" },
  { key: "graded", label: "채점 완료" },
  { key: "all", label: "전체" },
];

// 교수 채점함: 상태 탭(선택 알약이 미끄러짐) → 제출 카드 → 채점 창(제출 내용·AI 참고안·학점/점수/피드백)
export default function GradingBoard({ rows }: { rows: Row[] }) {
  const tap = useTapEffect();
  const [tab, setTab] = useState<Tab>("submitted");
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = rows.filter((r) => tab === "all" || r.status === tab);
  const count = (t: Tab) =>
    rows.filter((r) => t === "all" || r.status === t).length;

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="채점 상태"
        className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <motion.button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              whileTap={tap}
              onClick={() => setTab(t.key)}
              className={`relative isolate inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3.5 text-body-sm font-bold transition-colors ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {active && (
                <motion.span
                  layoutId="grading-tab-pill"
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full bg-brand"
                />
              )}
              {t.label}{" "}
              <span className="font-medium opacity-80">{count(t.key)}</span>
            </motion.button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-line bg-surface px-5 py-10 text-center shadow-soft">
          <NurseTurtle stage={3} mood="empty" size={88} decorative />
          <p className="mt-2 font-bold text-ink">
            {tab === "submitted"
              ? "채점할 과제가 없어요"
              : "이 상태의 과제가 없어요"}
          </p>
          <p className="mt-1 text-body-sm text-ink-soft">
            같은 학교·같은 방 학생이 케이스를 제출하면 여기에 모여요
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={SPRING_SOFT}
                data-grading-row={r.status}
              >
                <SubmissionCard row={r} onOpen={() => setOpenId(r.id)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Modal
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title="케이스 채점"
      >
        {openId && (
          <GradingPanel
            key={openId}
            id={openId}
            onDone={() => setOpenId(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function SubmissionCard({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const [state, setState] = useState<{ message?: string; savedAt?: number }>(
    {},
  );
  const [approving, startApprove] = useTransition();
  return (
    <article
      aria-label={`${row.studentName} · ${row.title}`}
      className="flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-ink">
            {row.studentName}
            <span className="ml-1.5 text-caption font-medium text-ink-soft">
              {[row.memberNo, row.classLabel].filter(Boolean).join(" · ")}
            </span>
          </p>
          <p className="truncate text-title font-bold">{row.title}</p>
          <p className="text-body-sm text-ink-soft">
            {row.ward} · {row.ago} 제출
          </p>
        </div>
        <SubmissionStatusChip status={row.status} grade={row.grade} />
      </div>
      {row.score !== null && (
        <p className="text-body-sm text-ink-soft">점수 {row.score}점</p>
      )}
      {row.feedback && (
        <p className="line-clamp-2 rounded-control bg-subtle px-3 py-2 text-body-sm break-words text-ink-soft">
          <IconChat size={15} className="mr-1 inline align-[-0.2em]" />
          {row.feedback}
        </p>
      )}
      <FormStatus message={state.message} />
      <FormStatus
        savedAt={state.savedAt}
        savedText="A+로 승인하고 학생에게 알렸어요"
      />
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          onClick={onOpen}
          className="min-h-11 flex-1 px-4 text-body-sm"
        >
          {row.status === "submitted" ? "채점하기" : "다시 보기·고치기"}
        </Button>
        {row.status === "submitted" && (
          <Button
            type="button"
            variant="secondary"
            disabled={approving}
            onClick={() =>
              startApprove(async () =>
                setState(await quickApproveAction(row.id)),
              )
            }
            className="min-h-11 px-4 text-body-sm"
          >
            {approving ? "승인 중..." : "A+ 바로 승인"}
          </Button>
        )}
      </div>
    </article>
  );
}

/** 채점 창 내용: 열리면 제출 내용을 불러온다 (그동안 모양을 닮은 스켈레톤) */
function GradingPanel({ id, onDone }: { id: string; onDone: () => void }) {
  const [detail, setDetail] = useState<GradingDetail | null | undefined>(
    undefined,
  );
  useEffect(() => {
    let alive = true;
    loadGradingDetail(id).then((d) => alive && setDetail(d));
    return () => {
      alive = false;
    };
  }, [id]);

  if (detail === undefined) {
    return (
      <div
        role="status"
        aria-busy
        aria-label="제출 내용을 불러오는 중"
        className="space-y-3"
      >
        <Bone className="h-5 w-1/2" />
        <Bone className="h-4 w-1/3" />
        <div aria-hidden className="skeleton h-28 rounded-control" />
        <div aria-hidden className="skeleton h-40 rounded-control" />
      </div>
    );
  }
  if (detail === null)
    return (
      <p className="text-body-sm text-ink-soft">
        이미 지워졌거나 볼 수 없는 제출이에요.
      </p>
    );
  return <GradingForm detail={detail} onDone={onDone} />;
}

function GradingForm({
  detail,
  onDone,
}: {
  detail: GradingDetail;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<
    FormState<GradeField>,
    FormData
  >(gradeAction, {});
  const [ai, setAi] = useState<{ suggestion?: GradingAi; message?: string }>(
    {},
  );
  const [asking, startAsk] = useTransition();
  const [memoOpen, setMemoOpen] = useState(false);
  // 참고안을 넣으면 폼을 새 기본값으로 다시 그린다
  const [defaults, setDefaults] = useState({
    decision: detail.status === "revision" ? "revision" : "graded",
    grade: detail.grade ?? "",
    score: detail.score !== null ? String(detail.score) : "",
    feedback: detail.feedback ?? "",
    key: 0,
  });
  const v = state.values;
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.savedAt) onDone();
  }, [state.savedAt, onDone]);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-bold text-ink">
          {detail.studentName}
          <span className="ml-1.5 text-caption font-medium text-ink-soft">
            {[detail.memberNo, detail.classLabel].filter(Boolean).join(" · ")}
          </span>
        </p>
        <p className="text-title font-bold">{detail.title}</p>
        <p className="text-body-sm text-ink-soft">{detail.ward}</p>
      </div>

      <div className="rounded-control bg-subtle px-3 py-2">
        <button
          type="button"
          aria-expanded={memoOpen}
          onClick={() => setMemoOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between text-left text-body-sm font-bold"
        >
          학생 원본 메모 <span aria-hidden>{memoOpen ? "⌃" : "⌄"}</span>
        </button>
        {memoOpen && (
          <p className="pb-2 text-body-sm break-words whitespace-pre-line text-ink">
            {detail.memo}
          </p>
        )}
      </div>

      <AiResultView
        ai={detail.ai}
        notice="학생이 제출한 SOAPIE·간호진단 (AI 초안을 학생이 확인해 낸 것)"
      />

      {/* AI 채점 참고안 */}
      <div className="rounded-card border border-line bg-canvas p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-body-sm font-bold text-ink">
            <IconSparkles
              size={17}
              className="mr-1 inline align-[-0.2em] text-brand-deep"
            />
            AI 채점 참고안
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={asking}
            onClick={() =>
              startAsk(async () => setAi(await gradingAiAction(detail.id)))
            }
            className="min-h-11 px-4 text-body-sm"
          >
            {asking
              ? "분석 중..."
              : ai.suggestion
                ? "다시 받기"
                : "참고안 받기"}
          </Button>
        </div>
        {asking && <WalkingTurtle label="AI가 제출물을 살펴보는 중" />}
        <FormStatus message={ai.message} />
        {ai.suggestion && !asking && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_SOFT}
            className="mt-3 space-y-2 text-body-sm"
            data-grading-ai
          >
            <p className="font-bold text-ink">
              제안: {ai.suggestion.grade} · {ai.suggestion.score}점{" "}
              <span className="font-medium text-ink-soft">
                (참고용, 최종 판단은 교수님)
              </span>
            </p>
            {ai.suggestion.strengths.length > 0 && (
              <ul className="list-disc pl-5 text-ink">
                {ai.suggestion.strengths.map((s, i) => (
                  <li key={i} className="flex gap-1.5">
                    <IconThumbUp
                      size={15}
                      className="mt-0.5 shrink-0 text-brand-deep"
                    />
                    {s}
                  </li>
                ))}
              </ul>
            )}
            {ai.suggestion.improvements.length > 0 && (
              <ul className="list-disc pl-5 text-ink">
                {ai.suggestion.improvements.map((s, i) => (
                  <li key={i} className="flex gap-1.5">
                    <IconPencil
                      size={15}
                      className="mt-0.5 shrink-0 text-warn-ink"
                    />
                    {s}
                  </li>
                ))}
              </ul>
            )}
            <p className="rounded-control bg-subtle px-3 py-2 break-words text-ink-soft">
              {ai.suggestion.feedback}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setDefaults((d) => ({
                  decision: "graded",
                  grade: ai.suggestion!.grade,
                  score: String(ai.suggestion!.score),
                  feedback: ai.suggestion!.feedback,
                  key: d.key + 1,
                }))
              }
              className="min-h-11 px-3 text-body-sm"
            >
              ↓ 아래 채점 칸에 넣기
            </Button>
          </motion.div>
        )}
      </div>

      <form
        key={defaults.key}
        action={action}
        noValidate
        className="space-y-4 border-t border-line/70 pt-4"
      >
        <input type="hidden" name="id" value={detail.id} />
        <ChoiceChips
          name="decision"
          legend="결과"
          options={[
            { key: "graded", label: "채점 완료" },
            { key: "revision", label: "보완 요청" },
          ]}
          defaultValue={v?.decision ?? defaults.decision}
        />
        {errors.decision && (
          <p className="text-body-sm text-danger">{errors.decision}</p>
        )}
        <ChoiceChips
          name="grade"
          legend="학점 (채점 완료일 때)"
          options={GRADES.map((g) => ({ key: g, label: g }))}
          defaultValue={v?.grade ?? defaults.grade}
        />
        {errors.grade && (
          <p className="text-body-sm text-danger">{errors.grade}</p>
        )}
        <Field
          name="score"
          label="점수 (선택, 0~100)"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          defaultValue={v?.score ?? defaults.score}
          error={errors.score}
          className="max-w-40"
        />
        <TextareaField
          name="feedback"
          label="피드백 (보완 요청이면 꼭 써 주세요)"
          maxLength={2000}
          rows={4}
          defaultValue={v?.feedback ?? defaults.feedback}
          error={errors.feedback}
        />
        <FormStatus message={state.message} />
        <Button type="submit" block disabled={pending}>
          {pending ? "저장 중..." : "저장하고 학생에게 알리기"}
        </Button>
      </form>
    </div>
  );
}
