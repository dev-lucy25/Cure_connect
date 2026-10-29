"use client";

import { motion } from "motion/react";
import { FADE_UP, SPRING_SOFT } from "@/lib/motion";

// 처음 보일 때 아래에서 살짝 떠오르며 나타난다 (페이지·카드 공통)
export default function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={FADE_UP} initial="hidden" animate="show" transition={{ ...SPRING_SOFT, delay }}>
      {children}
    </motion.div>
  );
}
