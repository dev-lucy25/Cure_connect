import "server-only";
import * as repo from "@/server/case-repo";
import { AI_FAILURE_MESSAGE, geminiCaseAi, type CaseAi } from "@/server/case-gemini";
import { detectPii, piiMessage } from "@/lib/validation/pii";

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
