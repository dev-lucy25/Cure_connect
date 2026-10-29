import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Supabase 메일 링크(가입 인증·비밀번호 재설정)가 돌아오는 곳.
// 주소의 code를 로그인 세션(쿠키)으로 바꾼 뒤 next로 보낸다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  // 만료됐거나 이미 쓴 링크
  return NextResponse.redirect(new URL("/reset-password?expired=1", origin));
}

/** 다른 사이트로 튕겨 내는 데 쓰이지 않게 이 사이트 안의 경로만 허용한다 */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
