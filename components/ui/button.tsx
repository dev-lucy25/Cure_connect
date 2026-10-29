"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import { buttonClass, type ButtonVariant } from "@/components/ui/button-class";

// 버튼: 누르면 스프링으로 살짝 작아졌다 돌아온다 (비활성일 때는 반응 없음)
export default function Button({
  variant = "primary",
  block = false,
  className = "",
  disabled,
  ...props
}: HTMLMotionProps<"button"> & { variant?: ButtonVariant; block?: boolean }) {
  const tap = useTapEffect();
  return (
    <motion.button
      whileTap={disabled ? undefined : tap}
      transition={SPRING_SNAPPY}
      disabled={disabled}
      // CSS 눌림(.press)은 motion과 겹치지 않게 뺀다
      className={`${buttonClass(variant, block).replace("press ", "")} ${className}`}
      {...props}
    />
  );
}
