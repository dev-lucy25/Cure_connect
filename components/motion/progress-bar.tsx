"use client";

import { motion, useReducedMotion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";

// 진행 막대: 처음엔 0에서 스프링으로 차오르고, 값이 바뀌면 그 자리에서 이어서 늘거나 준다.
// 움직임 줄이기 설정이면 바로 그 길이로 그린다. children은 막대 위에 얹는 눈금 등.
export default function ProgressBar({
  percent,
  label,
  className,
  barClassName,
  minPercent = 0,
  children,
}: {
  percent: number;
  label: string;
  className: string;
  barClassName: string;
  /** 0보다 크면 아주 작은 값도 보이게 최소 길이(%) */
  minPercent?: number;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const width = `${percent > 0 ? Math.max(percent, minPercent) : 0}%`;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className={className}>
      <motion.div
        className={barClassName}
        initial={{ width: reduce ? width : "0%" }}
        animate={{ width }}
        transition={reduce ? { duration: 0 } : SPRING_SOFT}
      />
      {children}
    </div>
  );
}
