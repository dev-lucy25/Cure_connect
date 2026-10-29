"use client";

import { AnimatePresence, motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";

// 열고 닫히는 영역(폼·펼치기)을 높이째 부드럽게 접고 편다
export default function Collapse({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          className={className}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={SPRING_SOFT}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
