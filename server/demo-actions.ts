"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoLoginPassword } from "@/lib/env/server";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo";

// 1초 체험: 서버만 아는 시드 비밀번호로 체험 계정에 로그인한다 (꺼져 있으면 아무것도 안 함).
// 이미 로그인돼 있으면 먼저 로그아웃 → 학생·교수 화면을 오가는 "역할 전환"에도 쓴다.
export async function demoLogin(role: DemoRole): Promise<{ message?: string }> {
  const password = demoLoginPassword();
  const account = DEMO_ACCOUNTS[role];
  if (!password || !account) return { message: "지금은 체험 로그인을 쓸 수 없어요" };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password });
  if (error) return { message: "체험 계정으로 들어가지 못했어요. 잠시 후 다시 시도해 주세요" };
  redirect("/");
}
