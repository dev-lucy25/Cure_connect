"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site-origin";
import { setPendingEmail } from "@/lib/pending-email";
import { safeNext } from "@/lib/safe-next";
import { emailForMember, inviteCodeMatches, memberNoTaken, orgExists, roomCodeInUse, roomExists } from "@/server/org-repo";
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
    if (error.code === "email_not_confirmed") {
      await setPendingEmail("signup", credentials.email);
      return { status: "error", message: "이메일 인증을 먼저 완료해 주세요", needsVerify: true, values };
    }
    return { status: "error", message: WRONG_LOGIN, values };
  }

  // 로그인이 필요한 화면에서 왔으면 그 화면으로 돌아간다
  redirect(safeNext(String(formData.get("next") ?? "")));
}

/** Supabase 가입 오류 코드 → 사용자 안내 */
function signupError(code: string | undefined): AuthFormState {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return { fieldErrors: { email: "이미 가입된 이메일이에요. 로그인해 주세요" } };
    case "weak_password":
      return { fieldErrors: { password: "너무 쉬운 비밀번호예요. 영문·숫자·기호를 섞어 주세요" } };
    case "email_address_invalid":
    case "email_address_not_authorized":
      return { fieldErrors: { email: "이 이메일 주소로는 인증 메일을 보낼 수 없어요. 다른 이메일을 써 주세요" } };
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return { status: "error", message: "지금 인증 메일을 보낼 수 있는 횟수를 넘었어요. 잠시(최대 1시간) 뒤 다시 가입해 주세요" };
    case "signup_disabled":
    case "email_provider_disabled":
      return { status: "error", message: "지금은 새 가입을 받지 않아요. 관리자에게 문의해 주세요" };
    default:
      return { status: "error", message: "가입하지 못했어요. 잠시 후 다시 시도해 주세요" };
  }
}

const SIGNUP_FIELDS = ["name", "email", "role", "orgId", "memberNo", "grade", "classGroup", "staffTitle", "inviteCode", "roomCode"] as const;

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = Object.fromEntries(SIGNUP_FIELDS.map((f) => [f, str(formData, f)]));

  const parsed = signupSchema.safeParse({ ...values, password: formData.get("password"), passwordConfirm: formData.get("passwordConfirm") });
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
  if (input.roomCode && input.role === "professor" && (await roomCodeInUse(input.roomCode))) {
    return { fieldErrors: { roomCode: "이미 쓰이고 있는 방 코드예요. 다른 코드를 정해 주세요" }, values };
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
  if (duplicated) return { fieldErrors: { email: "이미 가입된 이메일이에요. 로그인해 주세요" }, values };
  if (error || !data.user) {
    // 원인을 뭉뚱그리지 않고 알려 준다. 서버 기록에는 오류 코드만 남긴다(이메일·비밀번호는 남기지 않음)
    console.error("[signup] supabase", error?.status, error?.code);
    return { ...signupError(error?.code), values };
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
    // 위에서 확인한 사이에 같은 학번이 먼저 가입된 경우. 계정은 만들어졌으니 역할·학교는 그대로 두고 학번만 비운다
    // (교수는 초대 코드를 이미 확인했으므로 교수로 유지). 인증 뒤 내 정보에서 학번을 다시 넣는다
    await db.profile.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: input.email,
        name: input.name,
        role: input.role,
        orgId: input.orgId,
        staffTitle: professor ? input.staffTitle : null,
      },
      update: {},
      select: { id: true },
    });
  }

  // 메일 인증이 켜져 있으면 세션 없이 돌아온다 → 메일로 받은 코드를 넣는 화면으로
  if (!data.session) {
    await setPendingEmail("signup", input.email);
    redirect("/verify");
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
