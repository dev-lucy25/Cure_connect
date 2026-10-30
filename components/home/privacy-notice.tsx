"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";
import { IconAlert } from "@/components/ui/icons";

// 환자 개인정보 보호 지침 배너 (케이스 화면). 닫으면 이 기기에서는 다시 안 보인다.
// 첫 그림은 서버와 같게 "보임", 브라우저에서 닫은 기록을 읽은 뒤 숨긴다 (저장소를 못 쓰면 계속 보임)
const KEY = "np-privacy-notice-dismissed";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export default function PrivacyNotice() {
  const dismissed = useSyncExternalStore(subscribe, read, () => false);
  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    listeners.forEach((l) => l());
  }
  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          key="privacy"
          role="note"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={SPRING_SOFT}
          className="overflow-hidden"
          data-privacy-notice
        >
          <div className="flex items-start gap-3 rounded-card border border-warn-line bg-warn-bg p-4 text-body-sm text-warn-ink">
            <IconAlert size={22} className="mt-px shrink-0" />
            <p className="flex-1">
              <span className="font-bold">환자 개인정보 보호 지침</span> —
              환자의 이름·등록번호·생년월일·연락처 같은 식별 정보는 쓰지 마세요.
              실습 학습용 기록이고, 식별 정보가 보이면 저장·AI 전송 전에 막아요.
            </p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="안내 닫기"
              className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-warn-line/40"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
