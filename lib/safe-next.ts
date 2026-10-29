// 로그인 뒤 돌아갈 주소. 다른 사이트로 튕겨 내는 데 쓰이지 않게 이 사이트 안의 경로만 허용한다
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") && !next.startsWith("/login") ? next : "/";
}

/** 지금 화면으로 돌아오는 로그인 주소 */
export function loginHref(path: string) {
  const next = safeNext(path);
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
