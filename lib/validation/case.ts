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

/** NANDA-I 13개 영역. AI는 이 중 하나만 고를 수 있다 */
export const NANDA_DOMAINS = [
  "영역 1. 건강증진",
  "영역 2. 영양",
  "영역 3. 배설/교환",
  "영역 4. 활동/휴식",
  "영역 5. 지각/인지",
  "영역 6. 자아지각",
  "영역 7. 역할관계",
  "영역 8. 성",
  "영역 9. 대처/스트레스 내성",
  "영역 10. 삶의 원리",
  "영역 11. 안전/보호",
  "영역 12. 안위",
  "영역 13. 성장/발달",
] as const;

// AI에 알려주는 응답 형식 (구조만). 개수·길이 상한은 아래 caseAiResultSchema로 받은 뒤 검사한다.
export const caseAiOutputSchema = z.object({
  title: z.string(),
  S: z.array(z.string()),
  O: z.array(z.string()),
  A: z.array(z.string()),
  P: z.array(z.string()),
  I: z.array(z.string()),
  E: z.array(z.string()),
  diagnoses: z.array(
    z.object({
      priority: z.number().int(),
      name: z.string(),
      relatedTo: z.string(),
      domain: z.enum(NANDA_DOMAINS),
    }),
  ),
  missingInfo: z.array(z.string()),
});

const items = z.array(z.string().trim().min(1).max(300)).max(12);

const diagnosis = z.object({
  priority: z.number().int().min(1).max(6),
  name: z.string().trim().min(1).max(100),
  relatedTo: z.string().trim().max(200),
  /** 예전(v1) 결과에는 영역이 없어서 빈 문자열 */
  domain: z.union([z.enum(NANDA_DOMAINS), z.literal("")]),
});

/** 저장 전 엄격 검사 (현재 형식 v2) */
export const caseAiResultSchema = z.object({
  /** AI가 제안한 케이스 제목. 없으면 빈 문자열 */
  title: z.string().trim().max(60),
  S: items,
  O: items,
  A: items,
  P: items,
  I: items,
  E: items,
  /** 우선순위 순서(1순위부터)로 정렬해 저장한다 */
  diagnoses: z.array(diagnosis).max(6),
  missingInfo: items,
});

export type CaseAiResult = z.infer<typeof caseAiResultSchema>;
export type CaseDiagnosis = CaseAiResult["diagnoses"][number];

/** 예전 형식(v1): 간호진단이 "진단명 r/t 관련요인" 문자열 목록, 제목 없음 */
const caseAiResultV1Schema = z.object({
  S: items,
  O: items,
  A: items,
  P: items,
  I: items,
  E: items,
  nursingDiagnoses: items.max(6),
  missingInfo: items,
});

/** DB에서 꺼낸 값 읽기: v2는 그대로, v1은 v2 모양으로 바꿔 화면이 한 가지 형식만 다루게 한다 */
export const storedCaseAiSchema = z.union([
  caseAiResultSchema,
  caseAiResultV1Schema.transform(({ nursingDiagnoses, ...rest }): CaseAiResult => ({
    ...rest,
    title: "",
    diagnoses: nursingDiagnoses.map((text, i) => {
      const [name, ...related] = text.split(/\s*r\/t\s*/);
      return { priority: i + 1, name: name.trim().slice(0, 100) || text.slice(0, 100), relatedTo: related.join(" r/t ").trim().slice(0, 200), domain: "" as const };
    }),
  })),
]);

/** AI 결과를 저장 형식으로: 우선순위 순 정렬, 같은 순위가 겹치면 1부터 다시 매김 */
export function normalizeAiResult(result: CaseAiResult): CaseAiResult {
  const diagnoses = [...result.diagnoses]
    .sort((a, b) => a.priority - b.priority)
    .map((d, i) => ({ ...d, priority: i + 1 }));
  return { ...result, diagnoses };
}
