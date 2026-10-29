"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";
import { inviteCodeMatches, memberNoTaken, orgExists, roomExists } from "@/server/org-repo";
import { professorUpgradeSchema, profileSchema, type ProfileField } from "@/lib/validation/auth";
import { fieldErrorsOf, type FormState } from "@/lib/validation/form";

// 내 정보 수정. 항상 로그인한 본인 것만 바꾸고, 바꾼 뒤 프로필 캐시를 비워 바로 보이게 한다.

const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요";
const TAKEN = "이 학교에 이미 등록된 학번·교번이에요";

const PROFILE_FIELDS = ["name", "orgId", "memberNo", "grade", "classGroup", "staffTitle", "roomCode"] as const;
const UPGRADE_FIELDS = ["orgId", "memberNo", "inviteCode", "staffTitle"] as const;

function pick<F extends string>(formData: FormData, fields: readonly F[]) {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")])) as Record<F, string>;
}

/** 같은 학번이 동시에 저장된 경우(DB 고유 제약 위반) */
function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function saveProfile(_prev: FormState<ProfileField>, formData: FormData): Promise<FormState<ProfileField>> {
  const user = await getCurrentUser();
  const values = pick(formData, PROFILE_FIELDS);
  const professor = user.role === "professor";
  // 교수는 학교를 바꿀 수 없다 (다른 학교 교수가 되려면 그 학교 초대 코드가 필요).
  // 교수 방 코드는 교수 대시보드에서 바꾼다
  if (professor) {
    values.orgId = user.orgId ?? "";
    values.roomCode = user.roomCode ?? "";
  }

  const parsed = profileSchema(user.role === "professor" ? "professor" : "student").safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<ProfileField>(parsed.error), values };
  const input = parsed.data;

  if (input.orgId && input.orgId !== user.orgId && !(await orgExists(input.orgId))) {
    return { fieldErrors: { orgId: "학교를 다시 골라 주세요" }, values };
  }
  if (input.orgId && input.memberNo && (await memberNoTaken(input.orgId, input.memberNo, user.id))) {
    return { fieldErrors: { memberNo: TAKEN }, values };
  }
  if (!professor && input.roomCode && input.roomCode !== user.roomCode && !(await roomExists(input.roomCode))) {
    return { fieldErrors: { roomCode: "없는 방 코드예요. 교수님께 받은 코드를 확인해 주세요" }, values };
  }

  try {
    await db.profile.update({
      where: { id: user.id },
      data: {
        name: input.name,
        orgId: input.orgId,
        memberNo: input.memberNo,
        grade: professor ? null : input.grade,
        classGroup: professor ? null : input.classGroup,
        staffTitle: professor ? input.staffTitle : null,
        roomCode: input.roomCode,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { fieldErrors: { memberNo: TAKEN }, values };
    return { message: SAVE_FAILED, values };
  }
  updateTag(`profile:${user.id}`);
  return { savedAt: Date.now() };
}

/** 학생 계정을 교수·조교로 바꾼다. 그 학교의 초대 코드가 맞을 때만 */
export async function becomeProfessor(_prev: FormState<ProfileField>, formData: FormData): Promise<FormState<ProfileField>> {
  const user = await getCurrentUser();
  const values = pick(formData, UPGRADE_FIELDS);
  if (user.role !== "student") return { message: "이미 교수 계정이에요", values };

  const parsed = professorUpgradeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<ProfileField>(parsed.error), values };
  const input = parsed.data;

  if (!(await inviteCodeMatches(input.orgId, input.inviteCode))) {
    return { fieldErrors: { inviteCode: "초대 코드가 맞지 않아요. 학과 사무실에 확인해 주세요" }, values };
  }
  if (await memberNoTaken(input.orgId, input.memberNo, user.id)) {
    return { fieldErrors: { memberNo: TAKEN }, values };
  }

  try {
    await db.profile.update({
      where: { id: user.id },
      data: {
        role: "professor",
        orgId: input.orgId,
        memberNo: input.memberNo,
        staffTitle: input.staffTitle,
        grade: null,
        classGroup: null,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { fieldErrors: { memberNo: TAKEN }, values };
    return { message: SAVE_FAILED, values };
  }
  updateTag(`profile:${user.id}`);
  redirect("/");
}
