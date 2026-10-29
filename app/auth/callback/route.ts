import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

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
  // 만료됐거나 이미 쓴 링크, 또는 메일을 요청한 기기와 다른 기기에서 연 링크 → 메일의 코드로 이어가게 안내
  const failed = next.startsWith("/reset-password") ? "/reset-password?expired=1" : "/verify?expired=1";
  return NextResponse.redirect(new URL(failed, origin));
}

