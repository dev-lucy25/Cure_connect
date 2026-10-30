"use server";

import { refresh, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";
import { AVATAR_MAX_BYTES, avatarUrl, sniffImageType } from "@/lib/avatar";

// 프로필 사진 바꾸기·되돌리기. 항상 로그인한 본인 것만 바꾸고, 바꾼 뒤 프로필 캐시를 비워 앱 바까지 바로 보이게 한다.

export type AvatarState = { message?: string; savedAt?: number; notice?: string; avatarUrl?: string | null };

const SAVE_FAILED = "사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요";

export async function uploadAvatar(_prev: AvatarState, formData: FormData): Promise<AvatarState> {
  const user = await getCurrentUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { message: "사진을 골라 주세요" };
  if (file.size > AVATAR_MAX_BYTES) return { message: "사진이 너무 커요. 다른 사진으로 해 주세요" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffImageType(bytes);
  if (!contentType) return { message: "JPG·PNG·WebP 사진만 올릴 수 있어요" };

  try {
    // 한 사람에 사진 하나: 예전 사진을 지우고 새 id로 만든다 (주소가 바뀌어 캐시된 옛 사진이 보이지 않는다)
    const created = await db.$transaction(async (tx) => {
      await tx.profileAvatar.deleteMany({ where: { userId: user.id } });
      return tx.profileAvatar.create({ data: { userId: user.id, data: bytes, contentType }, select: { id: true } });
    });
    updateTag(`profile:${user.id}`);
    refresh();
    return { savedAt: Date.now(), notice: "프로필 사진을 바꿨어요", avatarUrl: avatarUrl(created.id) };
  } catch {
    return { message: SAVE_FAILED };
  }
}

export async function removeAvatar(): Promise<AvatarState> {
  const user = await getCurrentUser();
  try {
    await db.profileAvatar.deleteMany({ where: { userId: user.id } });
  } catch {
    return { message: SAVE_FAILED };
  }
  updateTag(`profile:${user.id}`);
  refresh();
  return { savedAt: Date.now(), notice: "기본 거북이로 되돌렸어요", avatarUrl: null };
}
