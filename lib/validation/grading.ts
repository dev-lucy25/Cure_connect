import { z } from "zod";
import { detectPii, piiMessage } from "@/lib/validation/pii";

// 교수 채점: 학점(A+~F) + 100점 점수(선택) + 피드백. 보완 요청은 피드백이 꼭 있어야 한다.

export const GRADES = ["A+", "A", "B+", "B", "C+", "C", "D", "F"] as const;
export type Grade = (typeof GRADES)[number];

const feedback = z
  .string()
  .trim()
  .max(2000, { error: "피드백은 2,000자 이하로 써 주세요" })
  .superRefine((v, ctx) => {
    const kinds = detectPii(v);
    if (kinds.length > 0) ctx.addIssue({ code: "custom", message: piiMessage(kinds) });
  });

const score = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .pipe(
    z
      .number({ error: "점수는 숫자로 써 주세요" })
      .int({ error: "점수는 정수로 써 주세요" })
      .min(0)
      .max(100, { error: "0~100점으로 써 주세요" })
      .nullable(),
  );

export const gradeSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("graded"), grade: z.enum(GRADES, { error: "학점을 골라 주세요" }), score, feedback }),
  z.object({
    decision: z.literal("revision"),
    grade: z.string().optional(),
    score,
    feedback: feedback.pipe(z.string().min(5, { error: "무엇을 보완할지 5자 이상 써 주세요" })),
  }),
]);
export type GradeInput = z.infer<typeof gradeSchema>;
export type GradeField = "decision" | "grade" | "score" | "feedback";

/** AI 채점 참고안 (교수만, 참고용) */
export const gradingAiSchema = z.object({
  score: z.number().int().min(0).max(100),
  grade: z.enum(GRADES),
  strengths: z.array(z.string().max(150)).max(3),
  improvements: z.array(z.string().max(150)).max(3),
  feedback: z.string().max(600),
});
export type GradingAi = z.infer<typeof gradingAiSchema>;
