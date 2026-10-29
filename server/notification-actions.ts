"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { markAllRead, markRead } from "@/server/notification-repo";
import { idSchema } from "@/lib/validation/form";

// 알림함: 읽음 처리. 본인 알림만 바뀐다(userId 조건).

export async function markReadAction(id: string) {
  const user = await getCurrentUser();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;
  await markRead(user.id, parsed.data).catch(() => {});
  refresh();
}

export async function markAllReadAction() {
  const user = await getCurrentUser();
  await markAllRead(user.id).catch(() => {});
  refresh();
}
