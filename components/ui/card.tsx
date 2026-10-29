import type { ComponentProps } from "react";

// 카드: 모서리 20, 안쪽 여백 20, 헤어라인 테두리, 아주 옅은 그림자
export default function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-card border border-line bg-surface p-5 shadow-soft ${className}`} {...props} />;
}
