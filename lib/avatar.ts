// 프로필 사진: 화면(편집기)과 서버(검사)가 같은 값을 쓴다.

/** 브라우저에서 이 크기의 정사각형으로 줄여 올린다 */
export const AVATAR_PX = 512;
/** 줄인 뒤 파일 크기 상한 (DB CHECK는 1MB, 여유 있게) */
export const AVATAR_MAX_BYTES = 512 * 1024;
/** 고를 수 있는 원본 사진 크기 상한 (줄이기 전) */
export const AVATAR_SOURCE_MAX_BYTES = 15 * 1024 * 1024;

/** 사진 주소. 없으면 null → 기본 거북이 */
export const avatarUrl = (avatarId: string | null | undefined) => (avatarId ? `/api/avatar/${avatarId}` : null);

/** 파일 앞부분(매직 바이트)으로 실제 형식을 확인한다. 확장자·브라우저가 알려준 형식은 믿지 않는다 */
export function sniffImageType(bytes: Uint8Array): "image/webp" | "image/png" | "image/jpeg" | null {
  const at = (i: number, ...values: number[]) => values.every((v, k) => bytes[i + k] === v);
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  return null;
}
