"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { markAllReadAction, markReadAction } from "@/server/notification-actions";
import { FADE_UP, SPRING_SOFT, STAGGER_STEP } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Card from "@/components/ui/card";

export type NotificationView = { id: string; kind: string; title: string; body: string; link: string | null; read: boolean; ago: string };

// 알림함: 안 읽은 알림은 민트 점 + 진한 글씨. 누르면 읽음 처리 후 연결된 화면으로 간다
export default function NotificationList({ items }: { items: NotificationView[] }) {
  const router = useRouter();
  const tap = useTapEffect();
  const [, startTransition] = useTransition();
  // 누르자마자 읽음으로 보이게 (서버 반영은 뒤따라온다)
  const [shown, markLocal] = useOptimistic(items, (list, id: string) =>
    list.map((n) => (id === "all" || n.id === id ? { ...n, read: true } : n)),
  );
  const unread = shown.filter((n) => !n.read).length;

  if (items.length === 0) {
    return (
      <Card className="flex flex-col items-center py-10 text-center">
        <NurseTurtle stage={2} mood="empty" size={88} decorative />
        <p className="mt-2 text-title font-bold">아직 받은 알림이 없어요</p>
        <p className="mt-1 text-body-sm text-ink-soft">교수님의 독려·채점 결과·일지 인증 소식이 여기에 모여요</p>
      </Card>
    );
  }

  function open(n: NotificationView) {
    startTransition(async () => {
      if (!n.read) {
        markLocal(n.id);
        await markReadAction(n.id);
      }
      if (n.link) router.push(n.link);
    });
  }

  function readAll() {
    startTransition(async () => {
      markLocal("all");
      await markAllReadAction();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-ink-soft" data-unread-count={unread}>
          {unread > 0 ? `안 읽은 알림 ${unread}개` : "모두 읽었어요"}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={readAll}
            className="inline-flex min-h-11 items-center text-body-sm font-bold text-brand-deep hover:underline"
          >
            모두 읽음
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {shown.map((n, i) => (
          <motion.li
            key={n.id}
            variants={FADE_UP}
            initial="hidden"
            animate="show"
            transition={{ ...SPRING_SOFT, delay: Math.min(i, 10) * STAGGER_STEP }}
          >
            <motion.button
              type="button"
              whileTap={tap}
              onClick={() => open(n)}
              data-notification={n.read ? "read" : "unread"}
              className={`flex w-full items-start gap-3 rounded-card border p-4 text-left transition-colors ${
                n.read ? "border-line bg-surface" : "border-brand bg-brand-soft/60"
              }`}
            >
              <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-deep"}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-body ${n.read ? "font-medium text-ink-soft" : "font-bold text-ink"}`}>{n.title}</span>
                <span className="mt-0.5 block text-body-sm break-words text-ink-soft">{n.body}</span>
                <span className="mt-1 block text-caption text-ink-soft">
                  {n.ago}
                  {n.link && " · 눌러서 보기 →"}
                </span>
              </span>
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
