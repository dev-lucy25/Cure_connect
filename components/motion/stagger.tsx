"use client";

import { motion } from "motion/react";
import { FADE_UP, SPRING_SOFT, STAGGER_STEP } from "@/lib/motion";
import { useFadeUp } from "@/components/motion/use-motion-prefs";

// 자식(StaggerItem)이 위에서부터 차례로 떠오르며 나타난다. 화면 배치(그리드 등)는 className으로 그대로 준다.
export function Stagger({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: STAGGER_STEP, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const variants = useFadeUp() ?? FADE_UP;
  return (
    <motion.div className={className} variants={variants} transition={SPRING_SOFT}>
      {children}
    </motion.div>
  );
}
