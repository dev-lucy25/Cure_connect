// 브라우저에 공개돼도 되는 값만 둔다 (NEXT_PUBLIC_*). 비밀 키는 lib/env/server.ts.
// proxy에서도 읽어야 하므로 server-only를 붙이지 않는다.
// 실제 값은 로컬 .env(git 무시)나 배포 환경변수에만 둔다. 코드에 값을 직접 쓰지 않는다.

// NEXT_PUBLIC_ 값은 빌드 때 그대로 박혀 들어가므로 process.env.이름 형태로 직접 읽어야 한다 (변수로 꺼내면 안 됨)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabasePublicConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 값이 필요합니다 (.env 또는 배포 환경변수)");
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}
