"use client";

import { useActionState, useState } from "react";
import { formatCaseDraft } from "@/lib/case-copy";
import type { SubmissionSummary } from "@/server/submission-repo";
import SubmitPanel from "@/components/cases/submit-panel";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";
import Collapse from "@/components/motion/collapse";
import { organizeCaseAction } from "@/server/case-actions";
import type { FormState } from "@/lib/validation/form";
import type { CaseAiResult } from "@/lib/validation/case";
import AiResultView from "@/components/cases/ai-result-view";
import { AiEditForm, RevisePanel } from "@/components/cases/ai-revise";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import { WalkingTurtle } from "@/components/ui/skeleton";

// SOAPIE 정리 카드(빠른 버튼). 기다리는 동안 이 카드 안에서만 거북이가 걷는다 (화면의 다른 곳은 그대로 쓸 수 있다)
export default function CaseAiPanel({
  caseId,
  caseTitle,
  ai,
  stale,
  usedToday,
  limit,
  professors,
  submission,
  submittedAgo,
}: {
  caseId: string;
  caseTitle: string;
  professors: string[];
  submission: SubmissionSummary | null;
  submittedAgo: string | null;
  ai: CaseAiResult | null;
  stale: boolean;
  usedToday: number;
  limit: number;
}) {
  const [state, action, pending] = useActionState<FormState<never>, FormData>(organizeCaseAction, {});
  const left = Math.max(0, limit - usedToday);
  // 직접 고치기 (정리 결과가 있고 메모가 그대로일 때만)
  const [editing, setEditing] = useState(false);
  const canTouch = Boolean(ai) && !stale && !pending;

  return (
    <Card aria-busy={pending} aria-labelledby="ai-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="ai-title" className="text-title font-bold">
          SOAPIE 초안
        </h2>
        <Chip tone="neutral">
          오늘 {left}/{limit}회 남음
        </Chip>
      </div>

      <Collapse open={stale && !pending}>
        <p className="mt-3 rounded-control bg-pink-soft px-4 py-2.5 text-body-sm font-bold text-pink-deep">
          정리한 뒤에 메모가 바뀌었어요. 다시 정리해 보세요.
        </p>
      </Collapse>

      {/* 기다림 → 결과 → 빈 상태가 서로 부드럽게 바뀐다 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pending ? "pending" : ai ? "result" : "empty"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SPRING_SOFT}
        >
          {pending ? (
            <div className="py-6 text-center">
              <WalkingTurtle label="정리하고 있어요" />
              <p className="text-body-sm text-ink-soft">최대 25초 걸려요</p>
            </div>
          ) : ai && editing && canTouch ? (
            <AiEditForm caseId={caseId} ai={ai} onDone={() => setEditing(false)} />
          ) : ai ? (
            <AiResultView ai={ai} />
          ) : (
            <div className="flex flex-col items-center py-6 text-center">
              <NurseTurtle stage={3} mood="empty" size={80} decorative />
              <p className="mt-2 text-body-sm text-ink-soft">메모를 SOAPIE·간호진단·빠진 사정 항목으로 정리해요</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {ai && canTouch && !editing && (
        <>
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="ghost" onClick={() => setEditing(true)} className="min-h-11 px-3 text-body-sm">
              ✏️ 직접 고치기
            </Button>
          </div>
          <RevisePanel caseId={caseId} left={left} />
        </>
      )}

      {ai && !pending && (
        <>
          <CopyDraftButton text={formatCaseDraft(caseTitle, ai)} />
          {/* 메모가 바뀐 뒤(stale)에는 서버가 제출을 막고 안내한다 */}
          <SubmitPanel caseId={caseId} professors={professors} submission={submission} submittedAgo={submittedAgo} />
        </>
      )}

      <form action={action} className="mt-4 space-y-2">
        <input type="hidden" name="id" value={caseId} />
        <FormStatus message={state.message} />
        <FormStatus savedAt={state.savedAt} savedText="정리했어요 🐢" />
        <Button type="submit" block disabled={pending || left === 0}>
          {pending ? "정리하는 중..." : left === 0 ? "오늘은 다 썼어요" : ai ? "SOAPIE로 다시 정리" : "SOAPIE로 정리"}
        </Button>
      </form>
    </Card>
  );
}

/** 초안 복사: 실습일지에 붙여 넣을 글로 복사. 클립보드 API가 막힌 환경은 예전 방식(execCommand)으로 */
function CopyDraftButton({ text }: { text: string }) {
  const [copiedAt, setCopiedAt] = useState<number | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  async function copy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) {
        setFailed(true);
        return;
      }
    }
    setCopiedAt(Date.now());
  }

  return (
    <div className="mt-4 space-y-2">
      <Button type="button" variant="secondary" block onClick={copy}>
        📋 초안 복사
      </Button>
      <FormStatus message={failed ? "복사하지 못했어요. 글을 길게 눌러 직접 복사해 주세요" : undefined} savedAt={copiedAt} savedText="초안을 복사했어요 📋" />
    </div>
  );
}

