import { z } from "zod";

export const idSchema = z.string().cuid({ error: "잘못된 요청이에요" });

/**
 * 저장 처리 결과. savedAt은 "저장됐어요" 표시를 다시 띄우기 위한 값.
 * values: React가 처리 후 폼을 비우므로, 실패하면 입력값을 돌려줘 그대로 다시 채운다.
 */
export type FormState<F extends string> = {
  fieldErrors?: Partial<Record<F, string>>;
  message?: string;
  savedAt?: number;
  values?: Partial<Record<F, string>>;
};

/** zod 오류를 "칸 이름 → 첫 번째 안내 문구"로 바꾼다 (칸 옆에 하나씩 보여주기 위함) */
export function fieldErrorsOf<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const { fieldErrors } = z.flattenError(error) as { fieldErrors: Partial<Record<F, string[]>> };
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, (v as string[] | undefined)?.[0]])) as Partial<
    Record<F, string>
  >;
}
