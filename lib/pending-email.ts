import "server-only";
import { cookies } from "next/headers";

// 인증 코드를 기다리는 이메일. 주소창에 이메일을 싣지 않으려고 1시간짜리 httpOnly 쿠키에 둔다.
// signup: 가입 인증 코드 / recovery: 비밀번호 재설정 코드

export type PendingKind = "signup" | "recovery";

const NAME: Record<PendingKind, string> = { signup: "np_verify_email", recovery: "np_reset_email" };

const OPTIONS = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 } as const;

/** 코드를 보낸 이메일과 보낸 시각(남은 시간 표시용)을 기억한다 */
export async function setPendingEmail(kind: PendingKind, email: string) {
  const jar = await cookies();
  jar.set(NAME[kind], email, OPTIONS);
  jar.set(`${NAME[kind]}_at`, String(Date.now()), OPTIONS);
}

/** 마지막으로 코드를 보낸 시각 (없으면 null) */
export async function getPendingSentAt(kind: PendingKind) {
  const at = Number((await cookies()).get(`${NAME[kind]}_at`)?.value);
  return Number.isFinite(at) && at > 0 ? at : null;
}

export async function getPendingEmail(kind: PendingKind) {
  return (await cookies()).get(NAME[kind])?.value ?? null;
}

export async function clearPendingEmail(kind: PendingKind) {
  const jar = await cookies();
  jar.delete(NAME[kind]);
  jar.delete(`${NAME[kind]}_at`);
}

/** 화면 표시용: liolo980506@gmail.com → li*******06@gmail.com */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 3) return `${local[0]}**@${domain}`;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(2, local.length - 4))}${local.slice(-2)}@${domain}`;
}
