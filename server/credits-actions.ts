"use server";

import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { listLedger } from "@/server/notes-repo";

// 내역 id는 cuid만 있는 게 아니다(마이그레이션이 만든 "signup_…", "adjust_x100_…") → 안전한 글자만 허용
const ledgerCursor = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

/** 크레딧 내역 더 보기 (본인 것만) */
export async function loadMoreLedger(cursor: string) {
  const user = await getCurrentUser();
  const parsed = ledgerCursor.safeParse(cursor);
  if (!parsed.success) return { items: [], nextCursor: null };
  return listLedger(user.id, parsed.data);
}
