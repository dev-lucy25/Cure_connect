import type { ReactNode } from "react";

type Tone = "mint" | "pink" | "cream";

const TONE: Record<Tone, string> = {
  mint: "bg-mint-soft text-mint-deep",
  pink: "bg-pink-soft text-pink-deep",
  cream: "bg-cream-deep text-ink-soft",
};

export default function Badge({ tone = "mint", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption font-bold ${TONE[tone]}`}>
      {children}
    </span>
  );
}
