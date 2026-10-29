import { z } from "zod";
import { detectPii, piiMessage } from "@/lib/validation/pii";

export const MEMO_MAX = 2000;

const noPii = (value: string, ctx: z.RefinementCtx) => {
  const kinds = detectPii(value);
  if (kinds.length > 0) ctx.addIssue({ code: "custom", message: piiMessage(kinds) });
};

export const caseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "제목을 입력해 주세요" })
    .max(60, { error: "제목은 60자 이하로 입력해 주세요" })
    .superRefine(noPii),
  ward: z.string().trim().min(1, { error: "병동을 입력해 주세요" }).max(60, { error: "병동은 60자 이하로 입력해 주세요" }),
  memo: z
    .string()
    .trim()
    .min(1, { error: "현장 메모를 입력해 주세요" })
    .max(MEMO_MAX, { error: `메모는 ${MEMO_MAX}자 이하로 입력해 주세요` })
    .superRefine(noPii),
});

export type CaseField = keyof z.infer<typeof caseSchema>;

export const QUESTION_MAX = 500;
export const ANSWER_MAX = 4000;

/** 케이스 챗봇에 보내는 질문 */
export const chatQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, { error: "질문을 입력해 주세요" })
    .max(QUESTION_MAX, { error: `질문은 ${QUESTION_MAX}자 이하로 입력해 주세요` })
    .superRefine(noPii),
});

/** AI 답변. 비었거나 너무 길면 저장하지 않는다 */
export const chatAnswerSchema = z.string().trim().min(1).max(ANSWER_MAX);

export const AI_SECTIONS = ["S", "O", "A", "P", "I", "E"] as const;

// AI에 알려주는 응답 형식 (구조만). 개수·길이 상한은 아래 caseAiResultSchema로 받은 뒤 검사한다.
export const caseAiOutputSchema = z.object({
  S: z.array(z.string()),
  O: z.array(z.string()),
  A: z.array(z.string()),
  P: z.array(z.string()),
  I: z.array(z.string()),
  E: z.array(z.string()),
  nursingDiagnoses: z.array(z.string()),
  missingInfo: z.array(z.string()),
});

const items = z.array(z.string().trim().min(1).max(300)).max(12);

/** 저장 전 엄격 검사. DB에서 꺼낸 값도 이걸로 다시 확인해 화면에 쓴다 */
export const caseAiResultSchema = z.object({
  S: items,
  O: items,
  A: items,
  P: items,
  I: items,
  E: items,
  nursingDiagnoses: items.max(6),
  missingInfo: items,
});

export type CaseAiResult = z.infer<typeof caseAiResultSchema>;
