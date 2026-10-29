"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema, type AuthField, type AuthFormState } from "@/lib/validation/auth";

function firstErrors(error: z.ZodError): AuthFormState["fieldErrors"] {
  const { fieldErrors } = z.flattenError(error) as { fieldErrors: Partial<Record<AuthField, string[]>> };
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]]));
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const values = { email: String(raw.email ?? "") };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const notConfirmed = error.code === "email_not_confirmed";
    return {
      status: "error",
      message: notConfirmed ? "이메일 인증을 먼저 완료해 주세요" : "이메일 또는 비밀번호가 맞지 않아요",
      values,
    };
  }

  redirect("/");
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") };
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };

  const { name, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  // 이메일 인증이 켜져 있으면 중복 가입은 오류 대신 identities가 빈 사용자로 돌아온다.
  const duplicated = data.user?.identities?.length === 0;
  if (error || !data.user || duplicated) {
    const taken = duplicated || error?.code === "user_already_exists";
    return taken
      ? { fieldErrors: { email: "이미 가입된 이메일이에요" }, values }
      : { status: "error", message: "가입하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }

  // 역할은 입력받지 않고 서버에서 student로 고정한다.
  await db.profile.upsert({
    where: { id: data.user.id },
    create: { id: data.user.id, email, name, role: "student" },
    update: {},
  });

  if (!data.session) {
    return { status: "info", message: "인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요", values };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
