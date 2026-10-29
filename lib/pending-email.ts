import "server-only";
import { cookies } from "next/headers";

// 인증 코드를 기다리는 이메일. 주소창에 이메일을 싣지 않으려고 1시간짜리 httpOnly 쿠키에 둔다.
// signup: 가입 인증 코드 / recovery: 비밀번호 재설정 코드

export type PendingKind = "signup" | "recovery";

const NAME: Record<PendingKind, string> = { signup: "np_verify_email", recovery: "np_reset_email" };

export async function setPendingEmail(kind: PendingKind, email: string) {
  (await cookies()).set(NAME[kind], email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function getPendingEmail(kind: PendingKind) {
  return (await cookies()).get(NAME[kind])?.value ?? null;
}

export async function clearPendingEmail(kind: PendingKind) {
  (await cookies()).delete(NAME[kind]);
}

/** 화면 표시용: liolo980506@gmail.com → li*******06@gmail.com */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 3) return `${local[0]}**@${domain}`;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(2, local.length - 4))}${local.slice(-2)}@${domain}`;
}
