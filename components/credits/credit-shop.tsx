"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cancelOrderAction, confirmOrderAction, createOrderAction } from "@/server/payment-actions";
import type { Order } from "@/server/payment-repo";
import { CREDIT_PACKAGES, UPLOAD_REWARD } from "@/lib/credits";
import { SPRING_SOFT } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import AnimatedNumber from "@/components/motion/animated-number";
import Button from "@/components/ui/button";
import FormStatus from "@/components/ui/form-status";
import { WalkingTurtle } from "@/components/ui/skeleton";
import Segmented from "@/components/ui/segmented";

// 크레딧 충전소. 상품 고르기 → 가상 결제 창 → 승인 중 → 충전 완료 (단계가 부드럽게 바뀐다).
// 지금은 테스트용 가상 결제(실제 돈 없음). 금액·크레딧은 서버가 상품표로 정한다.

type Step =
  { name: "shop" } | { name: "checkout"; order: Order } | { name: "processing"; order: Order } | { name: "done"; credits: number };

const METHODS = ["신용·체크카드", "토스페이", "카카오페이"] as const;

export default function CreditShop({ onWrite }: { onWrite: () => void }) {
  const [step, setStep] = useState<Step>({ name: "shop" });
  const [method, setMethod] = useState<(typeof METHODS)[number]>(METHODS[0]);
  const [message, setMessage] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const tap = useTapEffect(0.98);

  function choose(packageId: string) {
    setMessage(undefined);
    startTransition(async () => {
      const res = await createOrderAction(packageId);
      if (res.order) setStep({ name: "checkout", order: res.order });
      else setMessage(res.message);
    });
  }

  function pay(order: Order) {
    setMessage(undefined);
    setStep({ name: "processing", order });
    startTransition(async () => {
      const res = await confirmOrderAction(order.orderId);
      if (res.credits) setStep({ name: "done", credits: res.credits });
      else {
        setMessage(res.message);
        setStep({ name: "checkout", order });
      }
    });
  }

  function cancel(order: Order) {
    setStep({ name: "shop" });
    void cancelOrderAction(order.orderId);
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step.name}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={SPRING_SOFT}
        className="space-y-2.5"
      >
        {step.name === "shop" && (
          <>
            <p className="text-body-sm text-ink-soft">
              선배들의 병동 시크릿 족보를 열어 보거나, 내 후기를 올려 크레딧을 무료로 적립할 수 있어요.
            </p>
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
                    {"best" in p && p.best && (
                      <span className="rounded bg-brand-deep px-1.5 py-0.5 text-caption font-bold text-surface">BEST</span>
                    )}
                  </p>
                  <p className="text-caption text-ink-soft">{p.hint}</p>
                </div>
                <Button type="button" disabled={pending} onClick={() => choose(p.id)} className="min-h-11 shrink-0 px-3 text-caption">
                  ₩{p.priceKrw.toLocaleString()} 결제
                </Button>
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
              <span className="shrink-0 rounded-control bg-warn-ink px-3 py-1.5 text-caption font-bold text-warn-bg">
                +{UPLOAD_REWARD} C
              </span>
            </motion.button>
            <FormStatus message={message} />
            <p className="pt-1 text-center">
              <Link
                href="/credits"
                className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
              >
                크레딧 내역 보기 →
              </Link>
            </p>
          </>
        )}

        {step.name === "checkout" && (
          <>
            <p className="rounded-control bg-warn-bg px-3 py-2 text-body-sm font-bold text-warn-ink">
              🧪 테스트용 가상 결제예요 · 실제 돈은 나가지 않아요
            </p>
            <dl className="space-y-1.5 rounded-control bg-subtle p-3.5 text-body-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">상품</dt>
                <dd className="font-bold text-ink">
                  {step.order.credits.toLocaleString()} 크레딧 ({step.order.label})
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">결제 금액</dt>
                <dd className="font-display text-title text-ink">₩{step.order.amountKrw.toLocaleString()}</dd>
              </div>
            </dl>
            <Segmented
              name="method"
              legend="결제 수단 (가상)"
              size="sm"
              value={method}
              onChange={setMethod}
              options={METHODS.map((m) => ({ value: m, label: m }))}
            />
            <FormStatus message={message} />
            <div className="flex gap-2">
              <Button type="button" onClick={() => pay(step.order)} className="flex-1">
                ₩{step.order.amountKrw.toLocaleString()} 결제하기
              </Button>
              <Button type="button" variant="ghost" onClick={() => cancel(step.order)}>
                취소
              </Button>
            </div>
          </>
        )}

        {step.name === "processing" && (
          <div className="py-6 text-center">
            <WalkingTurtle label="결제를 승인하고 있어요" />
          </div>
        )}

        {step.name === "done" && (
          <div className="py-4 text-center">
            <motion.p
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="text-display leading-none"
              aria-hidden
            >
              💎
            </motion.p>
            <p className="mt-2 font-display text-headline text-ink">
              +<AnimatedNumber value={step.credits} format={{ maximumFractionDigits: 0 }} /> 크레딧 충전 완료
            </p>
            <p className="mt-1 text-body-sm text-ink-soft">테스트용 가상 결제로 충전됐어요</p>
            <Button type="button" variant="secondary" block className="mt-4" onClick={() => setStep({ name: "shop" })}>
              확인
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
