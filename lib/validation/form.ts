import { z } from "zod";

/** zod 오류를 "칸 이름 → 첫 번째 안내 문구"로 바꾼다 (칸 옆에 하나씩 보여주기 위함) */
export function fieldErrorsOf<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const { fieldErrors } = z.flattenError(error) as { fieldErrors: Partial<Record<F, string[]>> };
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, (v as string[] | undefined)?.[0]])) as Partial<
    Record<F, string>
  >;
}
