"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import IconButton from "@/components/ui/icon-button";

// 공용 모달. 모바일(<768px)은 아래에서 올라오는 시트(아래로 끌어 닫기), md 이상은 가운데 창.
// Esc·바깥 누르기로 닫힘, 열려 있는 동안 포커스는 모달 안에서만 돌고 닫으면 원래 자리로 돌아간다. 뒤 화면 스크롤은 잠근다.

const MD_QUERY = "(min-width: 768px)";
const subscribeMd = (cb: () => void) => {
  const mq = matchMedia(MD_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const noop = () => () => {};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  // 서버에는 document가 없으므로 브라우저에 붙은 뒤에만 그린다
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const desktop = useSyncExternalStore(subscribeMd, () => matchMedia(MD_QUERY).matches, () => false);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  // 열릴 때: 첫 입력칸(없으면 창)에 포커스, 뒤 화면 스크롤 잠금 / 닫힐 때: 포커스 되돌리기
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>("input, select, textarea") ?? panel;
      first?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    // 포커스가 모달 밖으로 나가지 않게 처음·끝에서 돌린다
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  }

  if (!mounted) return null;
  const sheet = !desktop;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" onKeyDown={onKeyDown}>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className="relative flex max-h-[90dvh] w-full flex-col rounded-t-card bg-surface shadow-soft outline-none md:max-w-lg md:rounded-card"
            initial={sheet ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={sheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={sheet ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 4 }}
            transition={sheet ? SPRING_SOFT : SPRING_SNAPPY}
            // 모바일 시트: 아래로 끌어 내리면 닫힌다
            drag={sheet && !reduce ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {sheet && <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" />}
            <div className="flex shrink-0 items-start justify-between gap-2 px-5 pt-4 pb-2">
              <div className="min-w-0">
                <h2 id={titleId} className="text-title font-bold text-ink">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-0.5 text-body-sm text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
              <IconButton label="닫기" onClick={onClose} className="-mt-1 -mr-2 shrink-0">
                <span aria-hidden className="text-title leading-none">
                  ✕
                </span>
              </IconButton>
            </div>
            {/* 내용이 길면 이 안에서만 스크롤 (끌어 닫기와 겹치지 않게 터치 스크롤은 내용이 받음) */}
            <div className="overflow-y-auto overscroll-contain px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+20px)]" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
