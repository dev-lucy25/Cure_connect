import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 요청마다 새로 만들어야 한다 (쿠키·캐시 헤더가 요청 단위로 묶여 있음).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Component에서는 쿠키를 쓸 수 없다. 토큰 갱신은 proxy가 맡으므로 무시해도 된다.
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      },
    },
  });
}
