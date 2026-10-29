"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { submitCaseAction } from "@/server/submission-actions";
import type { SubmissionSummary } from "@/server/submission-repo";
import type { FormState } from "@/lib/validation/form";
import { SPRING_SOFT } from "@/lib/motion";
import Button from "@/components/ui/button";
import FormStatus from "@/components/ui/form-status";
import SubmissionStatusChip from "@/components/cases/submission-status-chip";

// 교수님께 과제 제출: 최근 제출 상태(채점 대기·학점·보완 요청) + 제출 버튼.
// submittedAgo는 서버에서 계산해 넘긴다(서버·브라우저 첫 그림이 같도록)
export default function SubmitPanel({
  caseId,
  professors,
  submission,
  submittedAgo,
}: {
  caseId: string;
  /** 과제를 받아 볼 교수님(같은 학교·같은 방). 없으면 제출 대신 연결 안내 */
  professors: string[];
  submission: SubmissionSummary | null;
  submittedAgo: string | null;
}) {
  const [state, action, pending] = useActionState<FormState<never>, FormData>(submitCaseAction, {});
  const waiting = submission?.status === "submitted";
  const canSubmit = professors.length > 0;

  return (
    <div className="mt-2 space-y-2">
      <AnimatePresence initial={false}>
        {submission && (
          <motion.div
            key={`${submission.id}-${submission.status}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_SOFT}
            className="space-y-2 rounded-control bg-subtle px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SubmissionStatusChip status={submission.status} grade={submission.grade} />
              {submittedAgo && <span className="text-caption text-ink-soft">{submittedAgo} 제출</span>}
            </div>
            {submission.feedback && <p className="text-body-sm break-words whitespace-pre-line text-ink">💬 {submission.feedback}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <form action={action} className="space-y-2">
        <input type="hidden" name="id" value={caseId} />
        <FormStatus message={state.message} />
        <FormStatus savedAt={state.savedAt} savedText="교수님께 제출했어요 📤" />
        <Button type="submit" variant="primary" block disabled={pending || waiting || !canSubmit}>
          {pending ? "제출하는 중..." : waiting ? "채점을 기다리는 중" : submission ? "📤 다시 제출" : "📤 교수님께 과제 제출"}
        </Button>
        {canSubmit ? (
          <p className="text-center text-caption text-ink-soft">받는 교수님: {professors.join(", ")}</p>
        ) : (
          <p className="text-center text-body-sm text-ink-soft">
            과제를 받을 교수님이 아직 없어요. 학교나 실습반 방 코드를 연결해 주세요 ·{" "}
            <Link href="/me" className="font-bold text-brand-deep underline underline-offset-2">
              내 정보
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
