"use client";

import { motion } from "motion/react";
import { FADE_UP, SPRING_SOFT } from "@/lib/motion";
import { useFadeUp } from "@/components/motion/use-motion-prefs";

// 화면을 옮길 때마다 본문이 아래에서 살짝 떠오르며 나타난다.
// template은 이동할 때마다 새로 그려지고, 레이아웃(앱 바·탭 바)은 감싸지 않아 그대로 있다.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const variants = useFadeUp() ?? FADE_UP;
  return (
    <motion.div variants={variants} initial="hidden" animate="show" transition={SPRING_SOFT}>
      {children}
    </motion.div>
  );
}
