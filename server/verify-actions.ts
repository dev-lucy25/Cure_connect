"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-origin";
import { clearPendingEmail, getPendingEmail } from "@/lib/pending-email";
import { newPasswordSchema, type ResetField } from "@/lib/validation/auth";
import { fieldErrorsOf } from "@/lib/validation/form";

// 메일로 받은 인증 코드 확인. 이메일은 쿠키(가입·재설정 요청 때 서버가 넣음)에서 읽는다.
// 링크와 달리 코드는 어느 기기에서 메일을 봐도 된다.

export type CodeField = "code" | ResetField;
export type CodeFormState = {
  fieldErrors?: Partial<Record<CodeField, string>>;
  message?: string;
  status?: "error" | "info";
  /** 코드 다시 받기를 누른 시각 (60초 대기 표시용) */
  resentAt?: number;
};

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/, { error: "메일로 받은 숫자 코드를 입력해 주세요" });

const NO_EMAIL = "인증할 이메일 정보가 사라졌어요. 다시 가입하거나 로그인해 주세요";

/** Supabase 코드 확인 오류 → 안내 */
function codeError(code: string | undefined): CodeFormState {
  if (code === "otp_expired") return { fieldErrors: { code: "코드가 만료됐거나 맞지 않아요. 새 코드를 받아 주세요" } };
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return { status: "error", message: "시도가 너무 많아요. 잠시 후 다시 해 주세요" };
  }
  return { fieldErrors: { code: "코드가 맞지 않아요. 메일의 코드를 다시 확인해 주세요" } };
}

/** 가입 인증 코드 확인 → 로그인된 상태로 홈 */
export async function verifySignupCode(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const email = await getPendingEmail("signup");
  if (!email) return { status: "error", message: NO_EMAIL };
  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { fieldErrors: { code: parsed.error.issues[0]?.message } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: parsed.data, type: "email" });
  if (error) {
    console.error("[verify] supabase", error.status, error.code);
    return codeError(error.code);
  }
  await clearPendingEmail("signup");
  redirect("/");
}

/** 가입 인증 코드 다시 보내기 */
export async function resendSignupCode(): Promise<CodeFormState> {
  const email = await getPendingEmail("signup");
  if (!email) return { status: "error", message: NO_EMAIL };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/` },
  });
  if (error) {
    console.error("[verify:resend] supabase", error.status, error.code);
    const limited = error.status === 429;
    return {
      status: "error",
      message: limited ? "조금 전에 보냈어요. 잠시 후 다시 받아 주세요" : "보내지 못했어요. 잠시 후 다시 시도해 주세요",
    };
  }
  return { status: "info", message: "새 인증 코드를 보냈어요. 메일함을 확인해 주세요", resentAt: Date.now() };
}

/** 비밀번호 재설정: 코드 확인 + 새 비밀번호 저장을 한 번에 */
export async function resetWithCode(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const email = await getPendingEmail("recovery");
  if (!email) return { status: "error", message: "재설정할 이메일 정보가 사라졌어요. 이메일을 다시 입력해 주세요" };
  const code = codeSchema.safeParse(formData.get("code"));
  const pw = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!code.success || !pw.success) {
    return {
      fieldErrors: {
        ...(code.success ? {} : { code: code.error.issues[0]?.message }),
        ...(pw.success ? {} : fieldErrorsOf<ResetField>(pw.error)),
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "recovery" });
  if (error) {
    console.error("[reset:verify] supabase", error.status, error.code);
    return codeError(error.code);
  }
  // 코드가 맞으면 이미 로그인된 상태다. 비밀번호 저장만 실패했으면 코드는 다시 못 쓰니 새 비밀번호 화면으로 보낸다
  await clearPendingEmail("recovery");
  const updated = await supabase.auth.updateUser({ password: pw.data.password });
  if (updated.error) redirect(`/reset-password/update?retry=${updated.error.code === "same_password" ? "same" : "1"}`);
  redirect("/");
}
