import "server-only";
import { cache } from "react";
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

// 모든 서버 화면·서버 처리는 이 함수로 로그인 사용자를 얻는다.
// 같은 요청 안에서는 한 번만 Supabase·DB를 조회한다.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createSupabaseServerClient();
  // getUser()는 Supabase 서버에 토큰을 검증받는다 (쿠키 값만 믿지 않음).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const select = { id: true, email: true, name: true, role: true } as const;
  const profile = await db.profile.findUnique({ where: { id: user.id }, select });
  if (profile) return profile;

  // 가입 직후 프로필 저장이 실패했던 경우에 대비. 역할은 항상 student로만 만든다.
  return db.profile.create({
    data: { id: user.id, email: user.email, name: user.email.split("@")[0].slice(0, 30), role: "student" },
    select,
  });
});

export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.role !== role) redirect("/");
  return user;
}
