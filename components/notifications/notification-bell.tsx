"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { IconBell } from "@/components/ui/icons";

const MotionLink = motion.create(Link);

// 앱 바의 알림 종. 안 읽은 알림이 있으면 빨간 숫자가 톡 튀어나온다(99개 넘으면 99+)
export default function NotificationBell({ unread }: { unread: number }) {
  return (
    <MotionLink
      href="/notifications"
      whileTap={{ scale: 0.92 }}
      transition={SPRING_SNAPPY}
      aria-label={unread > 0 ? `알림 ${unread}개 안 읽음` : "알림"}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft hover:text-ink"
    >
      <IconBell size={22} />
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            data-unread={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={SPRING_SNAPPY}
            aria-hidden
            className="absolute top-1.5 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] leading-none font-bold text-surface"
          >
            {unread > 99 ? "99+" : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </MotionLink>
  );
}
