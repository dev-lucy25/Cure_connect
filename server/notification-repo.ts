import "server-only";
import { db } from "@/lib/db";
import { todayKst } from "@/lib/dates";
import type { Prisma } from "@/generated/prisma/client";

// 알림함 DB 처리. userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.

export const NOTIFICATION_PAGE = 30;

export type NotificationInput = { userId: string; kind: string; title: string; body: string; link?: string | null };

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

/** 알림 보내기 (다른 DB 작업과 한 트랜잭션으로 묶을 때는 tx를 넘긴다) */
export async function notify(input: NotificationInput | NotificationInput[], tx: Prisma.TransactionClient = db) {
  const data = (Array.isArray(input) ? input : [input]).map((n) => ({ ...n, title: n.title.slice(0, 80), body: n.body.slice(0, 500) }));
  if (data.length) await tx.notification.createMany({ data });
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

/** 최근 알림 30개 */
export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATION_PAGE,
    select: { id: true, kind: true, title: true, body: true, link: true, readAt: true, createdAt: true },
  });
  return rows.map(({ readAt, createdAt, ...r }) => ({ ...r, read: readAt !== null, createdAt: createdAt.toISOString() }));
}

export async function markRead(userId: string, id: string) {
  await db.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

/** 오늘(한국 시간 0시부터) 이미 받은 알림이 있는 사용자 */
export async function notifiedToday(tx: Prisma.TransactionClient, userIds: string[], kind: string) {
  const since = new Date(`${todayKst()}T00:00:00+09:00`);
  const rows = await tx.notification.findMany({
    where: { userId: { in: userIds }, kind, createdAt: { gte: since } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return new Set(rows.map((r) => r.userId));
}
