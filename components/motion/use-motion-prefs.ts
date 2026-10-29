"use client";

import { useReducedMotion } from "motion/react";
import { TAP_SCALE } from "@/lib/motion";

/** 누름 효과: 평소엔 살짝 작아지고, 움직임 줄이기 설정이면 크기 대신 살짝 흐려진다 */
export function useTapEffect(scale: number = TAP_SCALE) {
  const reduce = useReducedMotion();
  return reduce ? { opacity: 0.75 } : { scale };
}
