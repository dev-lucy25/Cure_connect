import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/**
 * 로그인 사용자 또는 null. 로그인 없이도 열리는 화면(오픈형)에서 쓴다.
 * 같은 요청 안에서는 한 번만 Supabase·DB를 조회한다.
 */
export const getOptionalUser = cache(async (): Promise<CurrentUser | null> => {
  // Supabase가 토큰 만료를 현재 시각으로 확인하므로, 미리 그리기(prefetch) 단계가 아니라 실제 요청 때만 실행한다
  await connection();
  const supabase = await createSupabaseServerClient();
  // getUser()는 Supabase 서버에 토큰을 검증받는다 (쿠키 값만 믿지 않음).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const select = { id: true, email: true, name: true, role: true } as const;
  const profile = await db.profile.findUnique({ where: { id: user.id }, select });
  if (profile) return profile;

  // 가입 직후 프로필 저장이 실패했던 경우에 대비. 역할은 항상 student로만 만든다.
  return db.profile.create({
    data: { id: user.id, email: user.email, name: user.email.split("@")[0].slice(0, 30), role: "student" },
    select,
  });
});

/** 로그인이 꼭 필요한 화면·서버 처리에서 쓴다. 없으면 /login으로 보낸다. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.role !== role) redirect("/");
  return user;
}
