import type { ReactNode } from "react";

type Tone = "brand" | "pink" | "neutral" | "warn";

const TONE: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-deep",
  pink: "bg-pink-soft text-pink-deep",
  neutral: "bg-subtle text-ink-soft",
  warn: "bg-warn-bg text-warn-ink",
};

// 완전히 둥근 칩
export default function Chip({ tone = "brand", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-body-sm font-bold ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}
