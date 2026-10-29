"use client";

import { useState } from "react";

const COLORS = ["var(--color-brand)", "var(--color-pink)", "var(--color-warn-line)", "var(--color-o-bg)", "var(--color-a-bg)"];

// 결정적인 흩뿌림 값 (렌더마다 같은 모양 → 서버·브라우저 결과가 같다)
const PIECES = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  dx: ((i * 53) % 120) - 60,
  rot: ((i * 97) % 540) - 270,
  delay: (i % 6) * 40,
  color: COLORS[i % COLORS.length],
  round: i % 3 === 0,
}));

/**
 * 100시간 단위를 새로 넘는 순간 컨페티를 한 번 터뜨린다.
 * 처음 화면에 들어왔을 때는 터뜨리지 않고, 보고 있는 동안 기록을 넣어 단위를 넘었을 때만 터진다.
 */
export default function MilestoneConfetti({ earned }: { earned: number }) {
  const [seen, setSeen] = useState(earned);
  const [burst, setBurst] = useState(0);
  // 렌더 중 이전 값과 비교해 상태를 맞춘다 (effect 없이)
  if (earned !== seen) {
    setSeen(earned);
    if (earned > seen) setBurst((b) => b + 1);
  }
  if (burst === 0) return null;

  return (
    <div key={burst} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className={`animate-confetti absolute top-0 block size-2 ${p.round ? "rounded-full" : "rounded-[2px]"}`}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
