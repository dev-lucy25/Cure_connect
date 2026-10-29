import { z } from "zod";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { PRECEPTOR_WARDS } from "@/lib/preceptor-questions";

// P9 AI 학습 도구 검증: 모의 구술질문 답변 · AI 실습일지

const noPii = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label}을 ${min}자 이상 써 주세요` })
    .max(max, { error: `${label}은 ${max.toLocaleString()}자 이하로 써 주세요` })
    .superRefine((v, ctx) => {
      const kinds = detectPii(v);
      if (kinds.length > 0) ctx.addIssue({ code: "custom", message: piiMessage(kinds) });
    });

export const preceptorAnswerSchema = z.object({
  ward: z.enum(PRECEPTOR_WARDS, { error: "병동을 골라 주세요" }),
  questionKey: z.string().min(1).max(40),
  answer: noPii("답변", 5, 1000),
});
export type PreceptorField = "answer";

/** AI 평가 (모범 답안·잘한 점·보완점) */
export const preceptorEvalSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().max(160)).max(3),
  improvements: z.array(z.string().max(160)).max(3),
  modelAnswer: z.string().max(700),
});
export type PreceptorEval = z.infer<typeof preceptorEvalSchema>;

export const journalMemoSchema = z.object({
  date: z.iso.date({ error: "날짜를 골라 주세요" }),
  ward: noPii("병동", 1, 60),
  memo: noPii("메모", 5, 1000),
});

export const journalSchema = journalMemoSchema.extend({ content: noPii("일지", 10, 4000) });
export type JournalField = "date" | "ward" | "memo" | "content";

/** AI 일지 초안: 네 칸 */
export const journalAiSchema = z.object({
  today: z.array(z.string().max(200)).max(5),
  learned: z.array(z.string().max(200)).max(4),
  difficult: z.array(z.string().max(200)).max(3),
  nextGoal: z.array(z.string().max(200)).max(3),
});
export type JournalAi = z.infer<typeof journalAiSchema>;

/** 초안 → 고칠 수 있는 글 */
export function journalText(draft: JournalAi) {
  const part = (title: string, lines: string[]) => `${title}\n${lines.length ? lines.map((l) => `- ${l}`).join("\n") : "- "}`;
  return [
    part("1. 오늘 실습 내용", draft.today),
    part("2. 새롭게 배운 점", draft.learned),
    part("3. 어려웠던 점 · 개선할 점", draft.difficult),
    part("4. 다음 실습 목표", draft.nextGoal),
  ].join("\n\n");
}
