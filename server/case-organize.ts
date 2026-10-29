import "server-only";
import * as repo from "@/server/case-repo";
import { AI_FAILURE_MESSAGE, generateCaseAi, type GenerateCaseAi } from "@/server/case-ai";
import { detectPii, piiMessage } from "@/lib/validation/pii";

// AI 정리 한 번의 흐름. 화면과 무관하게 테스트할 수 있도록 서버 액션과 분리했다.
// 1) 내 케이스인지 → 2) 환자 식별 정보 차단(AI에 보내기 전) → 3) 하루 20회 예약 → 4) AI → 5) 형식 확인된 결과만 저장
export type OrganizeOutcome = { ok: true } | { ok: false; message: string };

export async function organizeCase(userId: string, caseId: string, generate: GenerateCaseAi = generateCaseAi): Promise<OrganizeOutcome> {
  const found = await repo.getCase(userId, caseId);
  if (!found) return { ok: false, message: "이미 지워졌거나 찾을 수 없는 케이스예요" };

  const pii = detectPii(`${found.title}\n${found.memo}`);
  if (pii.length > 0) return { ok: false, message: `AI에 보내지 않았어요. ${piiMessage(pii)}` };

  if (!(await repo.reserveAiUse(userId))) {
    return { ok: false, message: `AI 정리는 하루 ${repo.AI_DAILY_LIMIT}번까지예요. 내일 다시 써 주세요` };
  }

  const generated = await generate(found.memo, found.ward);
  if (!generated.ok) {
    await repo.refundAiUse(userId);
    return { ok: false, message: AI_FAILURE_MESSAGE[generated.reason] };
  }

  if (!(await repo.saveAiResult(userId, caseId, generated.result, found.memo))) {
    // 정리하는 동안 메모가 바뀌었거나 지워졌다. 결과를 버리고 횟수를 돌려준다.
    await repo.refundAiUse(userId);
    return { ok: false, message: "정리하는 동안 메모가 바뀌었어요. 다시 정리해 주세요" };
  }
  return { ok: true };
}
