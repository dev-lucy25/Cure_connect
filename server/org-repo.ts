import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";

// 학교(Organization) 조회. 초대 코드는 비교만 하고 화면으로 내보내지 않는다.

export type OrgOption = { id: string; name: string; shortName: string };

/** 학교 선택 목록. 거의 바뀌지 않으므로 서버에 하루 캐시한다 */
export async function listOrganizations(): Promise<OrgOption[]> {
  "use cache";
  cacheTag("orgs");
  cacheLife("days");
  return db.organization.findMany({ select: { id: true, name: true, shortName: true }, orderBy: { name: "asc" } });
}

export async function orgExists(orgId: string) {
  return (await db.organization.count({ where: { id: orgId } })) === 1;
}

/** 이 학교의 초대 코드가 맞는가 (대소문자 무시: 입력값은 검증 단계에서 대문자로 바꾼다) */
export async function inviteCodeMatches(orgId: string, inviteCode: string) {
  return (await db.organization.count({ where: { id: orgId, inviteCode } })) === 1;
}

export async function memberNoTaken(orgId: string, memberNo: string, exceptUserId?: string) {
  const found = await db.profile.findUnique({ where: { orgId_memberNo: { orgId, memberNo } }, select: { id: true } });
  return found !== null && found.id !== exceptUserId;
}

/** 이 방 코드를 쓰는 교수가 있는가 (학생이 방에 들어갈 때 오타 방지) */
export async function roomExists(roomCode: string) {
  return (await db.profile.count({ where: { roomCode, role: "professor" } })) > 0;
}

/** 다른 교수가 이미 쓰는 방 코드인가 */
export async function roomTakenByOtherProfessor(roomCode: string, exceptUserId?: string) {
  const found = await db.profile.findFirst({ where: { roomCode, role: "professor", ...(exceptUserId ? { NOT: { id: exceptUserId } } : {}) }, select: { id: true } });
  return found !== null;
}

/** 학교 + 학번(교번)으로 로그인할 때 Supabase에 넘길 이메일을 찾는다 */
export async function emailForMember(orgId: string, memberNo: string) {
  const found = await db.profile.findUnique({ where: { orgId_memberNo: { orgId, memberNo } }, select: { email: true } });
  return found?.email ?? null;
}
