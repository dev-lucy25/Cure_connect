import { z } from "zod";
import { detectPii, piiMessage } from "@/lib/validation/pii";

// 족보 댓글 입력. 화면(입력 중 안내)과 서버(저장 전 검사)가 같은 규칙을 쓴다.

export const COMMENT_MAX = 500;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;

const noPii = (value: string, ctx: z.RefinementCtx) => {
  const kinds = detectPii(value);
  if (kinds.length > 0) ctx.addIssue({ code: "custom", message: piiMessage(kinds) });
};

// 익명 표시·배지와 헷갈리는 이름은 닉네임으로 못 쓴다
const RESERVED = /^(익명|작성자|글쓴이|운영자|관리자|너스패스|nursepass)/i;

export const nicknameSchema = z
  .string()
  .trim()
  .min(NICKNAME_MIN, { error: `닉네임은 ${NICKNAME_MIN}자 이상으로 써 주세요` })
  .max(NICKNAME_MAX, { error: `닉네임은 ${NICKNAME_MAX}자 이하로 써 주세요` })
  .regex(/^[가-힣a-zA-Z0-9_.]+( [가-힣a-zA-Z0-9_.]+)*$/, { error: "한글·영문·숫자와 _ . 만 쓸 수 있어요" })
  .refine((v) => !RESERVED.test(v), { error: "이 닉네임은 쓸 수 없어요" });

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, { error: "댓글을 입력해 주세요" })
  .max(COMMENT_MAX, { error: `댓글은 ${COMMENT_MAX}자 이하로 써 주세요` })
  .superRefine(noPii);

export const commentSchema = z
  .object({
    body: commentBodySchema,
    anonymous: z.enum(["1", "0"]).transform((v) => v === "1"),
    nickname: z.string().optional(),
  })
  .transform((v, ctx) => {
    if (v.anonymous) return { body: v.body, anonymous: true as const, nickname: null };
    const nick = nicknameSchema.safeParse(v.nickname ?? "");
    if (!nick.success) {
      ctx.addIssue({ code: "custom", path: ["nickname"], message: nick.error.issues[0].message });
      return z.NEVER;
    }
    return { body: v.body, anonymous: false as const, nickname: nick.data };
  });

export type CommentField = "body" | "nickname";
export type CommentInput = z.infer<typeof commentSchema>;
