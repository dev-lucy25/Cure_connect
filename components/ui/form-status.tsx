"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SNAPPY, SPRING_SOFT, TWEEN_POP } from "@/lib/motion";

// 폼 상태: 오류는 그 자리에 문구로(살짝 흔들리며 등장), 저장 성공은 화면 아래 토스트("저장했어요 🐢")로 보여준다.
export default function FormStatus({ message, savedAt, savedText = "저장했어요 🐢" }: { message?: string; savedAt?: number; savedText?: string }) {
  if (message) {
    return (
      <motion.p
        key={message}
        role="alert"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: [6, -4, 2, 0] }}
        transition={TWEEN_POP}
        className="rounded-control bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger"
      >
        {message}
      </motion.p>
    );
  }
  // key가 바뀌면 토스트를 새로 띄운다 (저장할 때마다 다시 보임)
  return savedAt ? <Toast key={savedAt} text={savedText} /> : null;
}

const TOAST_MS = 2200;

// 모바일은 탭 바 바로 위, md 이상은 화면 아래 가운데. 아래에서 튀어 올라왔다가 잠시 뒤 내려가며 사라진다
function Toast({ text }: { text: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {shown && (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: 24, scale: 0.96, x: "-50%" }}
          animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
          exit={{ opacity: 0, y: 12, x: "-50%", transition: SPRING_SOFT }}
          transition={SPRING_SNAPPY}
          className="pointer-events-none fixed bottom-[calc(var(--size-tab)+env(safe-area-inset-bottom)+12px)] left-1/2 z-30 rounded-full bg-ink px-5 py-2.5 text-body-sm font-bold whitespace-nowrap text-canvas shadow-soft md:bottom-8"
        >
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
