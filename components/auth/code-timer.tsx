"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CODE_VALID_MS } from "@/lib/auth-code";
import { SPRING_SNAPPY } from "@/lib/motion";

/** sentAt부터 남은 밀리초. 1초마다 갱신(첫 그림은 서버와 같게 전체 시간) */
export function useRemaining(sentAt: number | null | undefined, validMs: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!sentAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);
  if (!sentAt) return null;
  return Math.max(0, validMs - ((now ?? sentAt) - sentAt));
}

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// 인증 코드 남은 시간 (가입 인증·비밀번호 재설정 공용). 1분 아래로 내려가면 경고색, 만료되면 안내
export default function CodeTimer({ sentAt }: { sentAt: number | null | undefined }) {
  const left = useRemaining(sentAt, CODE_VALID_MS);
  if (left === null) return null;
  const expired = left === 0;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={expired ? "expired" : "running"}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={SPRING_SNAPPY}
        role={expired ? "alert" : undefined}
        data-code-timer={expired ? "expired" : mmss(left)}
        className={`rounded-control px-4 py-2.5 text-center text-body-sm font-medium ${
          expired ? "bg-warn-bg text-warn-ink" : left < 60_000 ? "bg-warn-bg text-warn-ink" : "bg-subtle text-ink-soft"
        }`}
      >
        {expired ? (
          "코드가 만료됐어요. 새 코드를 받아 주세요"
        ) : (
          <>
            코드 유효 시간 <span className="font-display font-bold tabular-nums text-ink">{mmss(left)}</span>
          </>
        )}
      </motion.p>
    </AnimatePresence>
  );
}
