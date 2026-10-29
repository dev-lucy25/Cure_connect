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
  // getClaims()는 로그인 토큰의 서명(ES256)을 Supabase 공개키로 서버에서 직접 검증한다 (쿠키 값만 믿지 않음).
  // getUser()처럼 매 요청 Supabase 서버를 다녀오지 않아 빠르다. 서명이 틀리거나 만료된 토큰은 거부된다.
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  if (!claims?.sub || !claims.email) return null;
  const userId = claims.sub;
  const email = claims.email;

  const select = { id: true, email: true, name: true, role: true } as const;
  const profile = await db.profile.findUnique({ where: { id: userId }, select });
  if (profile) return profile;

  // 가입 직후 프로필 저장이 실패했던 경우에 대비. 역할은 항상 student로만 만든다.
  return db.profile.create({
    data: { id: userId, email, name: email.split("@")[0].slice(0, 30), role: "student" },
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
