import { AI_SECTIONS, type CaseAiResult } from "@/lib/validation/case";

// "초안 복사": 실습일지·과제에 바로 붙여 넣을 수 있는 글로 만든다.
// [제목] → 우선순위 간호진단 → 【S】~【E】 → 빠진 사정 항목 (빈 칸은 건너뜀)
export function formatCaseDraft(caseTitle: string, ai: CaseAiResult): string {
  const lines: string[] = [`[${ai.title || caseTitle}]`];

  if (ai.diagnoses.length > 0) {
    lines.push("", "■ NANDA-I 간호진단");
    for (const d of ai.diagnoses) {
      const related = d.relatedTo ? ` r/t ${d.relatedTo}` : "";
      const domain = d.domain ? ` (${d.domain})` : "";
      lines.push(`${d.priority}순위. ${d.name}${related}${domain}`);
    }
  }

  lines.push("", "■ SOAPIE 간호기록");
  for (const key of AI_SECTIONS) {
    const items = ai[key];
    if (items.length === 0) continue;
    lines.push(`【${key}】 ${items[0]}`, ...items.slice(1).map((item) => `      ${item}`));
  }

  if (ai.missingInfo.length > 0) {
    lines.push("", "■ 더 사정할 항목", ...ai.missingInfo.map((m) => `- ${m}`));
  }

  lines.push("", "※ AI 참고용 초안입니다. 반드시 직접 확인하세요.");
  return lines.join("\n");
}
