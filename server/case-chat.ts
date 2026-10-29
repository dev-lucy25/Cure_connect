import "server-only";
import * as repo from "@/server/case-repo";
import { AI_FAILURE_MESSAGE, geminiCaseAi, type CaseAi } from "@/server/case-gemini";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { AI_SECTIONS, type CaseAiResult } from "@/lib/validation/case";

// 케이스 AI 한 번의 흐름. 화면과 무관하게 테스트할 수 있도록 서버 액션과 분리했다.
// 1) 내 케이스인지 → 2) 환자 식별 정보 차단(AI에 보내기 전) → 3) 하루 20회 예약 → 4) AI → 5) 형식 확인된 결과만 저장
// AI가 실패하거나 저장하지 못하면 예약한 1회를 돌려준다.
export type Outcome = { ok: true } | { ok: false; message: string };

const NOT_FOUND = "이미 지워졌거나 찾을 수 없는 케이스예요";
const LIMIT_MESSAGE = `AI는 하루 ${repo.AI_DAILY_LIMIT}번까지 쓸 수 있어요. 내일 다시 써 주세요`;

function blockedByPii(text: string): Outcome | null {
  const pii = detectPii(text);
  return pii.length > 0 ? { ok: false, message: `AI에 보내지 않았어요. ${piiMessage(pii)}` } : null;
}

/** 빠른 버튼: 메모 → SOAPIE·간호진단·빠진 사정 항목 (같은 케이스에 저장) */
export async function organizeCase(userId: string, caseId: string, ai: CaseAi = geminiCaseAi): Promise<Outcome> {
  const found = await repo.getCase(userId, caseId);
  if (!found) return { ok: false, message: NOT_FOUND };
  const blocked = blockedByPii(`${found.title}\n${found.memo}`);
  if (blocked) return blocked;
  if (!(await repo.reserveAiUse(userId))) return { ok: false, message: LIMIT_MESSAGE };

  const result = await ai.soapie(found.memo, found.ward);
  if (!result.ok) {
    await repo.refundAiUse(userId);
    return { ok: false, message: AI_FAILURE_MESSAGE[result.reason] };
  }
  if (!(await repo.saveAiResult(userId, caseId, result.value, found.memo))) {
    // 정리하는 동안 메모가 바뀌었거나 지워졌다. 결과를 버리고 횟수를 돌려준다.
    await repo.refundAiUse(userId);
    return { ok: false, message: "정리하는 동안 메모가 바뀌었어요. 다시 정리해 주세요" };
  }
  return { ok: true };
}

/** 대화: 질문 → 답 (질문과 답을 함께 저장). question은 이미 zod 검사를 통과한 값 */
export async function askCase(userId: string, caseId: string, question: string, ai: CaseAi = geminiCaseAi): Promise<Outcome> {
  const found = await repo.getCase(userId, caseId);
  if (!found) return { ok: false, message: NOT_FOUND };
  const blocked = blockedByPii(`${found.title}\n${found.memo}\n${question}`);
  if (blocked) return blocked;
  if (!(await repo.reserveAiUse(userId))) return { ok: false, message: LIMIT_MESSAGE };

  const history = await repo.listChat(userId, caseId);
  const result = await ai.reply(found.memo, found.ward, history, question);
  if (!result.ok) {
    await repo.refundAiUse(userId);
    return { ok: false, message: AI_FAILURE_MESSAGE[result.reason] };
  }
  if (!(await repo.saveChatTurn(userId, caseId, question, result.value))) {
    await repo.refundAiUse(userId);
    return { ok: false, message: NOT_FOUND };
  }
  return { ok: true };
}

/** AI 수정 지시: 지금 결과 + 메모 + 지시 → 고친 결과 저장. instruction은 이미 zod 검사를 통과한 값 */
export async function reviseCase(userId: string, caseId: string, instruction: string, ai: CaseAi = geminiCaseAi): Promise<Outcome> {
  const found = await repo.getCase(userId, caseId);
  if (!found) return { ok: false, message: NOT_FOUND };
  if (!found.ai) return { ok: false, message: "먼저 SOAPIE로 정리해 주세요" };
  if (found.stale) return { ok: false, message: "정리한 뒤에 메모가 바뀌었어요. 다시 정리한 뒤 고쳐 주세요" };
  const blocked = blockedByPii(`${found.memo}\n${instruction}`);
  if (blocked) return blocked;
  if (!(await repo.reserveAiUse(userId))) return { ok: false, message: LIMIT_MESSAGE };

  const result = await ai.revise(found.memo, found.ward, found.ai, instruction);
  if (!result.ok) {
    await repo.refundAiUse(userId);
    return { ok: false, message: AI_FAILURE_MESSAGE[result.reason] };
  }
  if (!(await repo.saveAiResult(userId, caseId, result.value, found.memo))) {
    await repo.refundAiUse(userId);
    return { ok: false, message: "고치는 동안 메모가 바뀌었어요. 다시 정리해 주세요" };
  }
  return { ok: true };
}

/** 직접 고치기: 학생이 고친 결과(형식 검사 통과)를 저장. AI 횟수는 쓰지 않는다 */
export async function saveEditedResult(userId: string, caseId: string, result: CaseAiResult): Promise<Outcome> {
  const found = await repo.getCase(userId, caseId);
  if (!found) return { ok: false, message: NOT_FOUND };
  const lines = [result.title, ...AI_SECTIONS.flatMap((k) => result[k]), ...result.diagnoses.flatMap((d) => [d.name, d.relatedTo])];
  const pii = detectPii(lines.join("\n"));
  if (pii.length > 0) return { ok: false, message: `저장하지 않았어요. ${piiMessage(pii)}` };
  if (!(await repo.saveAiResult(userId, caseId, result, found.memo))) return { ok: false, message: "저장하는 동안 메모가 바뀌었어요. 다시 시도해 주세요" };
  return { ok: true };
}
