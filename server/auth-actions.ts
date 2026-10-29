"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-origin";
import { emailForMember, inviteCodeMatches, memberNoTaken, orgExists, roomExists, roomTakenByOtherProfessor } from "@/server/org-repo";
import {
  loginSchema,
  memberLoginSchema,
  signupSchema,
  type AuthField,
  type AuthFormState,
} from "@/lib/validation/auth";
import { fieldErrorsOf } from "@/lib/validation/form";

const firstErrors = fieldErrorsOf<AuthField>;

const WRONG_LOGIN = "아이디 또는 비밀번호가 맞지 않아요";

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "");

/** 이메일 또는 학교 + 학번(교번)으로 로그인한다. 어느 쪽이든 틀리면 같은 문구로 알린다 (가입 여부가 드러나지 않게) */
export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const method = formData.get("method") === "member" ? "member" : "email";
  const values = { method, email: str(formData, "email"), orgId: str(formData, "orgId"), memberNo: str(formData, "memberNo") };

  let credentials: { email: string; password: string };
  if (method === "member") {
    const parsed = memberLoginSchema.safeParse({ ...values, password: formData.get("password") });
    if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
    const email = await emailForMember(parsed.data.orgId, parsed.data.memberNo);
    if (!email) return { status: "error", message: WRONG_LOGIN, values };
    credentials = { email, password: parsed.data.password };
  } else {
    const parsed = loginSchema.safeParse({ email: values.email, password: formData.get("password") });
    if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
    credentials = parsed.data;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    const notConfirmed = error.code === "email_not_confirmed";
    return { status: "error", message: notConfirmed ? "이메일 인증을 먼저 완료해 주세요" : WRONG_LOGIN, values };
  }

  redirect("/");
}

const SIGNUP_FIELDS = ["name", "email", "role", "orgId", "memberNo", "grade", "classGroup", "staffTitle", "inviteCode", "roomCode"] as const;

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = Object.fromEntries(SIGNUP_FIELDS.map((f) => [f, str(formData, f)]));

  const parsed = signupSchema.safeParse({ ...values, password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), values };
  const input = parsed.data;

  // 역할은 서버가 정한다: 교수는 그 학교의 초대 코드가 맞을 때만, 아니면 가입 자체를 막는다
  if (input.role === "professor" && !(await inviteCodeMatches(input.orgId!, input.inviteCode!))) {
    return { fieldErrors: { inviteCode: "초대 코드가 맞지 않아요. 학과 사무실에 확인해 주세요" }, values };
  }
  if (input.orgId && !(await orgExists(input.orgId))) {
    return { fieldErrors: { orgId: "학교를 다시 골라 주세요" }, values };
  }
  if (input.orgId && input.memberNo && (await memberNoTaken(input.orgId, input.memberNo))) {
    return { fieldErrors: { memberNo: "이 학교에 이미 가입된 학번·교번이에요" }, values };
  }
  // 방 코드: 학생은 있는 방만(오타 방지), 교수는 다른 교수와 겹치지 않는 새 방
  if (input.roomCode && input.role === "student" && !(await roomExists(input.roomCode))) {
    return { fieldErrors: { roomCode: "없는 방 코드예요. 교수님께 받은 코드를 확인해 주세요" }, values };
  }
  if (input.roomCode && input.role === "professor" && (await roomTakenByOtherProfessor(input.roomCode))) {
    return { fieldErrors: { roomCode: "다른 교수님이 쓰는 방 코드예요. 다른 코드를 정해 주세요" }, values };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    // 인증 메일 링크는 /auth/callback에서 로그인 세션으로 바뀐 뒤 홈으로 간다
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/` },
  });

  // 이메일 인증이 켜져 있으면 중복 가입은 오류 대신 identities가 빈 사용자로 돌아온다.
  const duplicated = data.user?.identities?.length === 0;
  if (error || !data.user || duplicated) {
    const taken = duplicated || error?.code === "user_already_exists";
    return taken
      ? { fieldErrors: { email: "이미 가입된 이메일이에요" }, values }
      : { status: "error", message: "가입하지 못했어요. 잠시 후 다시 시도해 주세요", values };
  }

  const professor = input.role === "professor";
  try {
    await db.profile.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: input.email,
        name: input.name,
        role: input.role,
        orgId: input.orgId,
        memberNo: input.memberNo,
        grade: professor ? null : input.grade,
        classGroup: professor ? null : input.classGroup,
        staffTitle: professor ? input.staffTitle : null,
        roomCode: input.roomCode,
      },
      update: {},
      select: { id: true },
    });
  } catch {
    // 위에서 확인한 사이에 같은 학번이 먼저 가입된 경우. 계정은 만들어졌으니 학번 없이 로그인 후 내 정보에서 고치게 한다
    await db.profile.upsert({
      where: { id: data.user.id },
      create: { id: data.user.id, email: input.email, name: input.name, role: "student" },
      update: {},
      select: { id: true },
    });
    return { status: "error", message: "학번·교번이 방금 다른 계정에 등록됐어요. 로그인 후 내 정보에서 다시 입력해 주세요", values };
  }

  if (!data.session) {
    return { status: "info", message: "인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요", values };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
