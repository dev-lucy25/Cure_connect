"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { loadMoreLedger } from "@/server/credits-actions";
import type { LedgerEntry } from "@/server/notes-repo";
import type { CreditReason } from "@/generated/prisma/client";
import { FADE_UP, SPRING_SOFT, STAGGER_STEP } from "@/lib/motion";
import Button from "@/components/ui/button";
import FormStatus from "@/components/ui/form-status";
import { LedgerMoreSkeleton } from "@/components/ui/skeleton";

const REASON: Record<CreditReason, string> = {
  signup: "가입 보너스",
  upload: "족보 등록 보상",
  unlock: "족보 열람",
  delete_note: "족보 삭제 (보상 회수)",
  sale: "족보 판매 수익 (80%)",
  purchase: "크레딧 충전",
  refund: "결제 취소",
  admin_adjust: "크레딧 단위 변경 (×100)",
};

/** "10/29 (수) 14:05" — 서버가 넘긴 ISO 시각을 한국 시간으로 */
const fmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });

// 크레딧 내역: 최신순, 들어온 것은 +, 나간 것은 −. 더 불러온 줄도 차례로 떠오른다
export default function LedgerList({ items, nextCursor }: { items: LedgerEntry[]; nextCursor: string | null }) {
  const [more, setMore] = useState<LedgerEntry[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();

  function loadMore() {
    if (!cursor) return;
    setFailed(false);
    startLoading(async () => {
      try {
        const page = await loadMoreLedger(cursor);
        setMore((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      } catch {
        setFailed(true);
      }
    });
  }

  if (items.length === 0) return <p className="py-6 text-center text-body-sm text-ink-soft">아직 크레딧 내역이 없어요</p>;

  return (
    <div className="space-y-3">
      <ol className="divide-y divide-line/70">
        {[...items, ...more].map((e, i) => (
          <motion.li
            key={e.id}
            variants={FADE_UP}
            initial="hidden"
            animate="show"
            transition={{ ...SPRING_SOFT, delay: Math.min(i < items.length ? i : i - items.length, 10) * STAGGER_STEP }}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-ink">{REASON[e.reason]}</p>
              <p className="truncate text-caption text-ink-soft">
                {fmt.format(new Date(e.createdAt))}
                {e.noteTitle && ` · ${e.noteTitle}`}
              </p>
            </div>
            <span className={`shrink-0 font-display text-title ${e.delta >= 0 ? "text-brand-deep" : "text-pink-deep"}`}>
              {e.delta >= 0 ? "+" : "−"}
              {Math.abs(e.delta).toLocaleString()} C
            </span>
          </motion.li>
        ))}
      </ol>
      {loading && <LedgerMoreSkeleton />}
      {failed && <FormStatus message="내역을 더 불러오지 못했어요. 다시 눌러 주세요" />}
      {cursor && !loading && (
        <Button type="button" variant="ghost" block onClick={loadMore}>
          더 보기
        </Button>
      )}
    </div>
  );
}
