"use client";

import { useActionState, useState } from "react";
import { formatCaseDraft } from "@/lib/case-copy";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import Collapse from "@/components/motion/collapse";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { organizeCaseAction } from "@/server/case-actions";
import type { FormState } from "@/lib/validation/form";
import { AI_SECTIONS, type CaseAiResult } from "@/lib/validation/case";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import { WalkingTurtle } from "@/components/ui/skeleton";

type Section = (typeof AI_SECTIONS)[number];

// S·O·A·P·I·E 색 라벨 (globals.css의 --color-{s,o,a,p,i,e}-bg / -ink)
const SECTION: Record<Section, { label: string; className: string }> = {
  S: { label: "주관적 자료", className: "bg-s-bg text-s-ink" },
  O: { label: "객관적 자료", className: "bg-o-bg text-o-ink" },
  A: { label: "사정", className: "bg-a-bg text-a-ink" },
  P: { label: "계획", className: "bg-p-bg text-p-ink" },
  I: { label: "중재", className: "bg-i-bg text-i-ink" },
  E: { label: "평가", className: "bg-e-bg text-e-ink" },
};

// SOAPIE 정리 카드(빠른 버튼). 기다리는 동안 이 카드 안에서만 거북이가 걷는다 (화면의 다른 곳은 그대로 쓸 수 있다)
export default function CaseAiPanel({
  caseId,
  caseTitle,
  ai,
  stale,
  usedToday,
  limit,
}: {
  caseId: string;
  caseTitle: string;
  ai: CaseAiResult | null;
  stale: boolean;
  usedToday: number;
  limit: number;
}) {
  const [state, action, pending] = useActionState<FormState<never>, FormData>(organizeCaseAction, {});
  const left = Math.max(0, limit - usedToday);

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

      {ai && !pending && <CopyDraftButton text={formatCaseDraft(caseTitle, ai)} />}

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

// 결과: 안내·제목 → 우선순위 간호진단 → S·O·A·P·I·E → 빠진 항목 순으로 차례로 떠오른다. 진단 줄은 톡 튀며 나온다
function AiResultView({ ai }: { ai: CaseAiResult }) {
  return (
    <Stagger className="mt-4 space-y-4">
      <StaggerItem className="space-y-2">
        <p className="rounded-control bg-pink-soft px-4 py-2.5 text-body-sm font-bold text-pink-deep">참고용 초안 — 직접 확인하세요</p>
        {ai.title && (
          <p className="text-title font-bold text-ink">
            <span aria-hidden>📋 </span>
            {ai.title}
          </p>
        )}
      </StaggerItem>

      {ai.diagnoses.length > 0 && (
        <StaggerItem>
          <h3 className="text-body-sm font-bold text-ink-soft">NANDA-I 우선순위 간호진단</h3>
          <ol className="mt-2 space-y-2">
            {ai.diagnoses.map((d, i) => (
              <motion.li
                key={`${d.priority}-${d.name}`}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...SPRING_SNAPPY, delay: 0.1 + i * 0.05 }}
                className="rounded-control border border-warn-line bg-warn-bg px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded-full bg-ink px-2 py-0.5 text-caption font-bold text-canvas">{d.priority}순위</span>
                  <span className="font-bold break-words text-ink">{d.name}</span>
                  {d.domain && <span className="ml-auto text-caption text-warn-ink">{d.domain}</span>}
                </div>
                {d.relatedTo && <p className="mt-1 text-body-sm break-words text-warn-ink">관련요인: {d.relatedTo}</p>}
              </motion.li>
            ))}
          </ol>
        </StaggerItem>
      )}

      <div className="space-y-3">
        {AI_SECTIONS.map((key) => (
          <StaggerItem key={key}>
            <section aria-label={`${key} ${SECTION[key].label}`}>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-body-sm font-bold ${SECTION[key].className}`}>
                <span className="font-display text-title leading-none">{key}</span>
                {SECTION[key].label}
              </span>
              {ai[key].length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
                  {ai[key].map((line, i) => (
                    <li key={i} className="break-words">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 pl-1 text-body-sm text-ink-soft">메모에 해당 내용이 없어요</p>
              )}
            </section>
          </StaggerItem>
        ))}
      </div>

      {ai.missingInfo.length > 0 && (
        <StaggerItem>
          <div role="note" className="rounded-control border border-warn-line bg-warn-bg px-4 py-3 text-warn-ink">
            <h3 className="flex items-center gap-1.5 text-body font-bold">
              <span aria-hidden>⚠️</span> 빠진 사정 항목
            </h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-body-sm">
              {ai.missingInfo.map((m, i) => (
                <li key={i} className="break-words">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </StaggerItem>
      )}
    </Stagger>
  );
}
