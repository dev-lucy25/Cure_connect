"use client";

import { MotionConfig } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";

// 앱 전체 모션 기본값. 기기에서 "움직임 줄이기"를 켰으면 위치·크기 움직임을 끈다(투명도 변화만 남음)
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={SPRING_SOFT}>
      {children}
    </MotionConfig>
  );
}
