"use client";

import { motion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { AI_SECTIONS, type CaseAiResult } from "@/lib/validation/case";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

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

// 결과: 안내·제목 → 우선순위 간호진단 → S·O·A·P·I·E → 빠진 항목 순으로 차례로 떠오른다. 진단 줄은 톡 튀며 나온다
export default function AiResultView({ ai, notice = "참고용 초안 — 직접 확인하세요" }: { ai: CaseAiResult; notice?: string }) {
  return (
    <Stagger className="mt-4 space-y-4">
      <StaggerItem className="space-y-2">
        <p className="rounded-control bg-pink-soft px-4 py-2.5 text-body-sm font-bold text-pink-deep">{notice}</p>
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
