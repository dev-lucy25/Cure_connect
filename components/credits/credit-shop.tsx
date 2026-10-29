"use client";

import { motion } from "motion/react";
import { CREDIT_PACKAGES, UPLOAD_REWARD } from "@/lib/credits";
import { SPRING_SOFT } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";

// 크레딧 충전소 내용 (모달 안). 결제(P5) 전까지 충전 버튼은 "곧 열려요"로 막아 둔다.
export default function CreditShop({ onWrite }: { onWrite: () => void }) {
  const tap = useTapEffect(0.98);
  return (
    <div className="space-y-2.5">
      <p className="text-body-sm text-ink-soft">선배들의 병동 시크릿 족보를 열어 보거나, 내 후기를 올려 크레딧을 무료로 적립할 수 있어요.</p>
      {CREDIT_PACKAGES.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SOFT, delay: 0.05 * i }}
          className={`flex items-center justify-between gap-3 rounded-control border p-3.5 ${"best" in p && p.best ? "border-2 border-brand-deep bg-brand-soft" : "border-line"}`}
        >
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-bold text-ink">
              {p.credits.toLocaleString()} 크레딧 ({p.label})
              {"best" in p && p.best && <span className="rounded bg-brand-deep px-1.5 py-0.5 text-caption font-bold text-surface">BEST</span>}
            </p>
            <p className="text-caption text-ink-soft">{p.hint}</p>
          </div>
          <button
            type="button"
            disabled
            title="결제는 곧 열려요"
            className="shrink-0 rounded-control bg-subtle px-3 py-2 text-caption font-bold text-ink-soft"
          >
            ₩{p.priceKrw.toLocaleString()}
            <span className="block text-[11px] font-medium">곧 열려요</span>
          </button>
        </motion.div>
      ))}
      <motion.button
        type="button"
        onClick={onWrite}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SOFT, delay: 0.1 }}
        whileTap={tap}
        className="flex w-full items-center justify-between gap-3 rounded-control border border-warn-line bg-warn-bg p-3.5 text-left"
      >
        <span className="min-w-0">
          <span className="block font-bold text-warn-ink">✍️ 지난 실습 병동 후기 작성하기</span>
          <span className="block text-caption text-warn-ink">후배들을 위해 꿀팁을 남기면 무료 적립!</span>
        </span>
        <span className="shrink-0 rounded-control bg-warn-ink px-3 py-1.5 text-caption font-bold text-warn-bg">+{UPLOAD_REWARD} C</span>
      </motion.button>
    </div>
  );
}
