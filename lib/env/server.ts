import "server-only";

// 비밀 값은 이 파일에서만 읽는다. 브라우저 코드에서 import하면 빌드가 실패한다(server-only).
// 실제 값은 로컬 .env(git 무시)나 배포 환경변수에만 둔다. 코드에 값을 직접 쓰지 않는다.
// 값이 없을 때 앱 전체를 멈추지 않고, 그 값을 쓰는 기능만 실패하게 한다.

/** 앱 실행용 DB 주소 (Transaction pooler 6543). 없으면 import 시점이 아니라 첫 쿼리에서 실패한다 */
export function databaseUrl() {
  return process.env.DATABASE_URL;
}

/** 없으면 null → 케이스 AI가 "설정 필요"로 실패한다 */
export function geminiApiKey() {
  return process.env.GEMINI_API_KEY || null;
}
