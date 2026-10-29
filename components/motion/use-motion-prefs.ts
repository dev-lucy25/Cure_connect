"use client";

import { useReducedMotion } from "motion/react";
import { TAP_SCALE } from "@/lib/motion";

/** 누름 효과: 평소엔 살짝 작아지고, 움직임 줄이기 설정이면 크기 대신 살짝 흐려진다 */
export function useTapEffect(scale: number = TAP_SCALE) {
  const reduce = useReducedMotion();
  return reduce ? { opacity: 0.75 } : { scale };
}

/** 나타나기 시작 위치: 움직임 줄이기 설정이면 제자리에서 투명도만 바뀐다 */
export function useFadeUp() {
  const reduce = useReducedMotion();
  return reduce ? { hidden: { opacity: 0 }, show: { opacity: 1 } } : undefined;
}
