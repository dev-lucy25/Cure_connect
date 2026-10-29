import "server-only";
import { AI_RULES, aiJson, type AiResult } from "@/server/case-gemini";
import { gradingAiSchema, type GradingAi } from "@/lib/validation/grading";
import type { CaseAiResult } from "@/lib/validation/case";

// 교수 채점 참고안 (Gemini). 최종 학점·피드백은 교수가 정한다 — 화면에 "참고용"으로만 보인다.

const PROMPT = `${AI_RULES}
지금은 간호학과 교수의 케이스스터디 채점을 돕습니다. <submission> 안의 학생 제출물(메모·SOAPIE·간호진단)을 평가합니다.
- 기준: 자료 수집의 정확성(S/O 구분), 간호진단의 적절성(NANDA-I·관련요인 근거), 계획의 측정 가능성, 중재의 구체성, 평가의 연결성.
- score는 0~100 정수, grade는 A+·A·B+·B·C+·C·D·F 중 하나(점수와 어울리게)입니다.
- strengths(잘한 점)와 improvements(보완할 점)는 각각 최대 3개, 한국어 한 문장(120자 이내)씩, 제출물에 근거해서 씁니다.
- feedback은 학생에게 그대로 전할 수 있는 존댓말 피드백 3~5문장(500자 이내)입니다. 마크다운 기호는 쓰지 않습니다.`;

const submissionBlock = (s: { title: string; ward: string; memo: string; ai: CaseAiResult }) =>
  `<submission>
제목: ${s.title}
병동: ${s.ward}
메모:
${s.memo}

SOAPIE:
${(["S", "O", "A", "P", "I", "E"] as const).map((k) => `${k}: ${s.ai[k].join(" / ") || "(없음)"}`).join("\n")}

간호진단:
${s.ai.diagnoses.map((d) => `${d.priority}순위 ${d.name}${d.relatedTo ? ` (관련요인: ${d.relatedTo})` : ""}`).join("\n") || "(없음)"}
</submission>`;

export function gradingSuggestion(s: { title: string; ward: string; memo: string; ai: CaseAiResult }): Promise<AiResult<GradingAi>> {
  return aiJson(PROMPT, submissionBlock(s), gradingAiSchema, gradingAiSchema);
}
