"use client";

import { motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";

// 접고 펴는 영역. Collapse와 달리 접혀 있어도 안의 입력칸을 지우지 않는다(폼 값이 그대로 전송됨).
// 접혀 있을 땐 inert로 키보드 이동·화면 읽기에서 빠진다.
export default function Expandable({ open, children, className }: { open: boolean; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={false}
      animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
      transition={SPRING_SOFT}
      style={{ overflow: "hidden" }}
      inert={!open}
      className={className}
    >
      {children}
    </motion.div>
  );
}
