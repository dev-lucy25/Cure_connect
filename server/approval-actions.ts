"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { reviewLogs } from "@/server/approval-repo";
import { detectPii, piiMessage } from "@/lib/validation/pii";

// 일지 인증·반려. 교수인지 서버에서 다시 확인하고, 볼 수 있는 학생의 대기 일지만 바뀐다.

const input = z.object({
  ids: z.array(z.string().cuid()).min(1).max(200),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(200).default(""),
});

export async function reviewLogsAction(
  ids: string[],
  decision: "approved" | "rejected",
  reason = "",
): Promise<{ message?: string; savedAt?: number; notice?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "professor") return { message: "교수 계정만 인증할 수 있어요" };
  const parsed = input.safeParse({ ids, decision, reason });
  if (!parsed.success) return { message: "인증할 일지를 다시 골라 주세요" };
  const pii = detectPii(parsed.data.reason);
  if (pii.length > 0) return { message: piiMessage(pii) };
  const count = await reviewLogs(user, parsed.data.ids, parsed.data.decision, parsed.data.reason).catch(() => null);
  if (count === null) return { message: "처리하지 못했어요. 잠시 후 다시 시도해 주세요" };
  if (count === 0) return { message: "이미 처리됐거나 볼 수 없는 일지예요" };
  refresh();
  return { savedAt: Date.now(), notice: decision === "approved" ? `${count}건 인증했어요 ✅` : `${count}건 반려했어요` };
}
