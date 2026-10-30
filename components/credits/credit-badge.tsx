"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import AnimatedNumber from "@/components/motion/animated-number";
import Modal from "@/components/ui/modal";
import CreditShop from "@/components/credits/credit-shop";
import CreditMark from "@/components/ui/credit-mark";

// 앱 바의 "💎 1,200 C +충전" 배지. 누르면 충전소 모달, 잔액은 굴러가는 숫자
export default function CreditBadge({ credits }: { credits: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const tap = useTapEffect();
  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={tap}
        transition={SPRING_SNAPPY}
        aria-label={`보유 크레딧 ${credits.toLocaleString()}, 충전소 열기`}
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-brand-soft px-3 text-body-sm font-bold text-brand-deep"
      >
        <CreditMark size={18} />
        <AnimatedNumber value={credits} format={{ maximumFractionDigits: 0 }} />
        <span aria-hidden>C</span>
        <span
          aria-hidden
          className="ml-0.5 hidden rounded bg-brand-deep px-1.5 py-0.5 text-[10px] text-surface sm:inline"
        >
          +충전
        </span>
      </motion.button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="너스패스 크레딧 충전소"
      >
        <CreditShop
          onWrite={() => {
            setOpen(false);
            router.push("/notes?write=1");
          }}
        />
      </Modal>
    </>
  );
}
