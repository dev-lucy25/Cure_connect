"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";

// 44px 정사각 아이콘 버튼. 글자가 없으므로 label(스크린리더·툴팁용)은 꼭 준다. 누르면 톡 작아졌다 돌아온다
export default function IconButton({
  label,
  tone = "default",
  className = "",
  children,
  disabled,
  ...props
}: HTMLMotionProps<"button"> & { label: string; tone?: "default" | "danger"; children: ReactNode }) {
  const tap = useTapEffect(0.88);
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      whileTap={disabled ? undefined : tap}
      transition={SPRING_SNAPPY}
      className={`grid size-11 place-items-center rounded-full transition-colors disabled:opacity-50 ${
        tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-ink-soft hover:bg-subtle hover:text-ink"
      } ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
