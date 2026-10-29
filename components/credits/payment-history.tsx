"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { refundPaymentAction } from "@/server/payment-actions";
import type { PaymentRow } from "@/server/payment-repo";
import type { FormState } from "@/lib/validation/form";
import { REFUND_DAYS } from "@/lib/credits";
import { SPRING_SOFT } from "@/lib/motion";
import Button from "@/components/ui/button";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";

const fmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// 결제 내역: 완료·취소된 충전. 7일 안·충전 뒤 열람 없음·잔액 충분이면 "결제 취소"(한 번 더 확인)
export default function PaymentHistory({ rows }: { rows: PaymentRow[] }) {
  if (rows.length === 0) return <p className="py-3 text-center text-body-sm text-ink-soft">아직 충전 내역이 없어요</p>;
  return (
    <ul className="divide-y divide-line/70">
      {rows.map((r) => (
        <PaymentItem key={r.id} row={r} />
      ))}
    </ul>
  );
}

function PaymentItem({ row }: { row: PaymentRow }) {
  const [state, action, pending] = useActionState<FormState<never>, FormData>(refundPaymentAction, {});
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-ink">
            {row.credits.toLocaleString()} 크레딧 · ₩{row.amountKrw.toLocaleString()}
          </p>
          <p className="truncate text-caption text-ink-soft">
            {row.label}
            {row.approvedAt && ` · ${fmt.format(new Date(row.approvedAt))}`} · 가상 결제
          </p>
        </div>
        {row.status === "canceled" ? (
          <Chip tone="neutral" className="shrink-0 text-caption">
            취소됨
          </Chip>
        ) : row.refundable ? (
          !confirming && (
            <Button type="button" variant="ghost" onClick={() => setConfirming(true)} className="min-h-11 shrink-0 px-3 text-body-sm">
              결제 취소
            </Button>
          )
        ) : (
          <Chip className="shrink-0 text-caption">완료</Chip>
        )}
      </div>
      <AnimatePresence initial={false}>
        {confirming && row.status === "done" && (
          <motion.form
            action={action}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING_SOFT}
            className="overflow-hidden"
          >
            <input type="hidden" name="id" value={row.id} />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2 rounded-control bg-subtle px-3 py-2">
              <span className="mr-auto text-body-sm text-ink">{row.credits.toLocaleString()} 크레딧을 회수하고 결제를 취소할까요?</span>
              <Button type="submit" disabled={pending} className="min-h-11 px-3 text-body-sm">
                {pending ? "취소 중..." : "취소하기"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)} className="min-h-11 px-3 text-body-sm">
                그대로 두기
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <FormStatus message={state.message} savedAt={state.savedAt} savedText="결제를 취소했어요" />
      {row.status === "done" && !row.refundable && (
        <p className="mt-1 text-caption text-ink-soft">결제 후 {REFUND_DAYS}일 안, 충전 뒤 열람하지 않았을 때만 취소할 수 있어요</p>
      )}
    </li>
  );
}
