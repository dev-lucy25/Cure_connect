// 메일 인증 코드 규칙 (Supabase Auth 설정과 같게 유지: Email OTP length 6, expiration 600초)
export const CODE_LENGTH = 6;
export const CODE_VALID_MS = 10 * 60 * 1000;
/** 코드 다시 받기 사이 최소 간격 */
export const RESEND_WAIT_MS = 60 * 1000;
