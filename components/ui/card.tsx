import type { ComponentProps } from "react";

// 카드: 모서리 24, 안쪽 여백 20(md 이상 24), 헤어라인 테두리, 옅은 겹 그림자
export default function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-card border border-line/80 bg-surface p-5 shadow-soft md:p-6 ${className}`} {...props} />;
}
