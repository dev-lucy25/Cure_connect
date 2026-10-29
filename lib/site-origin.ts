import "server-only";
import { headers } from "next/headers";

/**
 * 메일 링크가 돌아올 주소의 앞부분(https://도메인). 서버 액션 요청의 Origin 헤더를 쓴다.
 * Supabase는 허용 목록(Auth → URL Configuration → Redirect URLs)에 있는 주소만 받아 준다.
 */
export async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
