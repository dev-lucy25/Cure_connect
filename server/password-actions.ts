"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-origin";
import { newPasswordSchema, resetRequestSchema, type ResetField, type ResetFormState } from "@/lib/validation/auth";
import { fieldErrorsOf } from "@/lib/validation/form";

/** 재설정 메일 보내기. 가입 여부가 드러나지 않게 결과와 상관없이 같은 안내를 한다 */
export async function requestPasswordReset(_prev: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = resetRequestSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<ResetField>(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${await siteOrigin()}/auth/callback?next=/reset-password/update`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error?.status === 429) {
    return { status: "error", message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요", values };
  }
  return { status: "info", message: "가입된 이메일이면 재설정 링크를 보냈어요. 메일함을 확인해 주세요", values };
}

/** 메일 링크로 들어온(로그인된) 상태에서 새 비밀번호로 바꾼다 */
export async function updatePassword(_prev: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<ResetField>(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { status: "error", message: "링크가 만료됐어요. 재설정 메일을 다시 받아 주세요" };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const same = error.code === "same_password";
    return { status: "error", message: same ? "이전과 다른 비밀번호를 써 주세요" : "바꾸지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
  redirect("/");
}
