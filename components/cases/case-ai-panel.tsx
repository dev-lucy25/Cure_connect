"use client";

import { useActionState } from "react";
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

// AI 정리 카드. 기다리는 동안 이 카드 안에서만 거북이가 걷는다 (화면의 다른 곳은 그대로 쓸 수 있다)
export default function CaseAiPanel({
  caseId,
  ai,
  stale,
  usedToday,
  limit,
}: {
  caseId: string;
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
          AI 케이스 정리
        </h2>
        <Chip tone="neutral">
          오늘 {left}/{limit}회 남음
        </Chip>
      </div>

      {stale && !pending && (
        <p className="mt-3 rounded-control bg-pink-soft px-4 py-2.5 text-body-sm font-bold text-pink-deep">
          정리한 뒤에 메모가 바뀌었어요. 다시 정리해 보세요.
        </p>
      )}

      {pending ? (
        <div className="py-6 text-center">
          <WalkingTurtle label="정리하고 있어요" />
          <p className="text-body-sm text-ink-soft">최대 15초 걸려요</p>
        </div>
      ) : ai ? (
        <AiResultView ai={ai} />
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <NurseTurtle stage={3} mood="empty" size={80} decorative />
          <p className="mt-2 text-body-sm text-ink-soft">메모를 SOAPIE·간호진단·빠진 사정 항목으로 정리해요</p>
        </div>
      )}

      <form action={action} className="mt-4 space-y-2">
        <input type="hidden" name="id" value={caseId} />
        <FormStatus message={state.message} />
        <FormStatus savedAt={state.savedAt} savedText="정리했어요 🐢" />
        <Button type="submit" block disabled={pending || left === 0}>
          {pending ? "정리하는 중..." : left === 0 ? "오늘은 다 썼어요" : ai ? "AI로 다시 정리" : "AI로 정리"}
        </Button>
      </form>
    </Card>
  );
}

function AiResultView({ ai }: { ai: CaseAiResult }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="rounded-control bg-pink-soft px-4 py-2.5 text-body-sm font-bold text-pink-deep">참고용 초안 — 직접 확인하세요</p>

      {ai.nursingDiagnoses.length > 0 && (
        <div>
          <h3 className="text-body-sm font-bold text-ink-soft">간호진단</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {ai.nursingDiagnoses.map((d) => (
              <li key={d}>
                <Chip>{d}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {AI_SECTIONS.map((key) => (
          <section key={key} aria-label={`${key} ${SECTION[key].label}`}>
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
        ))}
      </div>

      {ai.missingInfo.length > 0 && (
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
      )}
    </div>
  );
}
