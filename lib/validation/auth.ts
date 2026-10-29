import { z } from "zod";

const email = z.email({ error: "이메일 형식을 확인해 주세요" }).trim().toLowerCase();
const password = z
  .string()
  .min(8, { error: "비밀번호는 8자 이상이어야 해요" })
  .max(72, { error: "비밀번호는 72자 이하로 입력해 주세요" });
const name = z
  .string()
  .trim()
  .min(1, { error: "이름을 입력해 주세요" })
  .max(30, { error: "이름은 30자 이하로 입력해 주세요" });

/** 학번·교번: 영문·숫자·하이픈 4~20자 */
const memberNo = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{4,20}$/, { error: "학번·교번은 영문·숫자 4~20자로 입력해 주세요" });

/** 빈 칸은 null로 바꾼다 (선택 입력) */
const optional = <T extends z.ZodType<unknown, string>>(schema: T) =>
  z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(schema.nullable());

const optionalText = (label: string, max: number) =>
  optional(z.string().max(max, { error: `${label}은 ${max}자 이하로 입력해 주세요` }));

/** 학교 소속 정보 (회원가입·내 정보 수정 공통). orgId 빈 칸 = 학교 없이 개인으로 사용 */
const membership = {
  orgId: optional(z.string().max(30)),
  memberNo: optional(memberNo),
  grade: optional(z.string().regex(/^[1-4]$/, { error: "학년을 골라 주세요" }).transform(Number)),
  classGroup: optionalText("반", 10),
  staffTitle: optionalText("직책", 30),
};

/** 방 코드: 영문·숫자·하이픈 3~20자, 대문자로 저장 (DB CHECK와 같음) */
export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{3,20}$/, { error: "방 코드는 영문·숫자·하이픈 3~20자로 입력해 주세요" });

const optionalRoomCode = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(roomCodeSchema.nullable());

type Membership = { orgId: string | null; memberNo: string | null };

/** 학교를 고르면 학번(교번)이 필요하고, 학번만 쓰고 학교를 안 고르면 안 된다 */
function checkMembership(v: Membership, ctx: z.RefinementCtx, noLabel: string) {
  if (v.orgId && !v.memberNo) ctx.addIssue({ code: "custom", path: ["memberNo"], message: `${noLabel}을 입력해 주세요` });
  if (!v.orgId && v.memberNo) ctx.addIssue({ code: "custom", path: ["orgId"], message: "학교를 골라 주세요" });
}

export const loginSchema = z.object({ email, password });

/** 학교 + 학번(교번) + 비밀번호 로그인 */
export const memberLoginSchema = z.object({
  orgId: z.string().trim().min(1, { error: "학교를 골라 주세요" }).max(30),
  memberNo,
  password,
});

export const signupSchema = z
  .object({
    name,
    email,
    password,
    role: z.enum(["student", "professor"], { error: "역할을 골라 주세요" }),
    ...membership,
    inviteCode: optional(z.string().max(20).toUpperCase()),
    roomCode: optionalRoomCode,
  })
  .superRefine((v, ctx) => {
    const professor = v.role === "professor";
    checkMembership(v, ctx, professor ? "교번" : "학번");
    // 교수는 학교와 그 학교의 초대 코드가 꼭 있어야 한다 (코드가 맞는지는 서버가 DB로 확인)
    if (professor && !v.orgId) ctx.addIssue({ code: "custom", path: ["orgId"], message: "교수·조교는 소속 학교를 골라야 해요" });
    if (professor && !v.inviteCode) ctx.addIssue({ code: "custom", path: ["inviteCode"], message: "학교 초대 코드를 입력해 주세요" });
  });

export type SignupInput = z.infer<typeof signupSchema>;

export type AuthField =
  | "name"
  | "email"
  | "password"
  | "role"
  | "orgId"
  | "memberNo"
  | "grade"
  | "classGroup"
  | "staffTitle"
  | "inviteCode"
  | "roomCode";

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, string>>;
  message?: string;
  status?: "error" | "info";
  /** 실패했을 때 다시 채울 입력값 (비밀번호는 돌려주지 않는다) */
  values?: Partial<Record<Exclude<AuthField, "password"> | "method", string>>;
};

/** 내 정보 수정. 교수는 학교를 바꿀 수 없으므로(서버가 무시) 같은 검사를 쓴다 */
export const profileSchema = (role: "student" | "professor") =>
  z.object({ name, ...membership, roomCode: optionalRoomCode }).superRefine((v, ctx) => checkMembership(v, ctx, role === "professor" ? "교번" : "학번"));

/** 학생 계정을 교수·조교로 인증 (학교 초대 코드 필요) */
export const professorUpgradeSchema = z.object({
  orgId: z.string().trim().min(1, { error: "학교를 골라 주세요" }).max(30),
  memberNo,
  inviteCode: z.string().trim().min(1, { error: "학교 초대 코드를 입력해 주세요" }).max(20).toUpperCase(),
  staffTitle: optionalText("직책", 30),
});

export type ProfileField = "name" | "orgId" | "memberNo" | "grade" | "classGroup" | "staffTitle" | "inviteCode" | "roomCode";

/** 비밀번호 재설정 메일 요청 */
export const resetRequestSchema = z.object({ email });

/** 새 비밀번호 (두 번 입력해 같은지 확인) */
export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "두 비밀번호가 같지 않아요" });

export type ResetField = "email" | "password" | "confirm";
export type ResetFormState = {
  fieldErrors?: Partial<Record<ResetField, string>>;
  message?: string;
  status?: "error" | "info";
  values?: { email?: string };
};
