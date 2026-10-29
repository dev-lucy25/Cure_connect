import { z } from "zod";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { NOTE_CATEGORY_KEYS } from "@/lib/credits";

// 족보 입력. 목록형 칸(질문·준비물·팁)은 화면에서 "한 줄에 하나씩" 받아 줄 단위로 나눈다.
// 무료 맛보기: 제목·준비물·분위기 / 시크릿(열람해야 보임): 자주 받은 질문·팁

const noPii = (value: string, ctx: z.RefinementCtx) => {
  const kinds = detectPii(value);
  if (kinds.length > 0) ctx.addIssue({ code: "custom", message: piiMessage(kinds) });
};

const lines = (label: string, max: number, maxLen: number) =>
  z
    .string()
    .transform((s) =>
      s
        .split("\n")
        .map((l) => l.replace(/^\s*[-•·]\s*/, "").trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().max(maxLen, { error: `${label} 한 줄은 ${maxLen}자 이하로 써 주세요` }))
        .max(max, { error: `${label}은 ${max}줄까지 쓸 수 있어요` }),
    );

export const noteSchema = z
  .object({
    hospital: z.string().trim().min(1, { error: "병원을 입력해 주세요" }).max(60, { error: "병원은 60자 이하로 입력해 주세요" }),
    ward: z.string().trim().min(1, { error: "병동을 입력해 주세요" }).max(60, { error: "병동은 60자 이하로 입력해 주세요" }),
    category: z.enum(NOTE_CATEGORY_KEYS, { error: "실습 과목 분류를 골라 주세요" }),
    // 가격은 정해진 값만 (DB CHECK와 같음)
    price: z.enum(["0", "300", "500"], { error: "열람 가격을 골라 주세요" }).transform(Number),
    title: z
      .string()
      .trim()
      .min(1, { error: "제목을 입력해 주세요" })
      .max(80, { error: "제목은 80자 이하로 입력해 주세요" })
      .superRefine(noPii),
    questions: lines("자주 받은 질문", 10, 200),
    supplies: lines("준비물", 10, 100),
    atmosphere: z.string().trim().max(500, { error: "분위기는 500자 이하로 써 주세요" }),
    tips: lines("팁", 10, 200),
  })
  .superRefine((v, ctx) => {
    // 유료 족보는 열어 볼 시크릿(질문·팁)이 있어야 한다
    if (v.price > 0 && v.questions.length + v.tips.length === 0) {
      ctx.addIssue({ code: "custom", path: ["questions"], message: "유료 족보는 자주 받은 질문이나 팁을 하나 이상 써 주세요" });
    }
    if (v.questions.length + v.supplies.length + v.tips.length === 0 && v.atmosphere === "") {
      ctx.addIssue({ code: "custom", path: ["questions"], message: "질문·준비물·분위기·팁 중 하나는 써 주세요" });
    }
    // 본문 전체에서 환자 식별 정보를 찾아 해당 칸에 알린다
    for (const key of ["questions", "supplies", "atmosphere", "tips"] as const) {
      const text = Array.isArray(v[key]) ? (v[key] as string[]).join("\n") : (v[key] as string);
      const kinds = detectPii(text);
      if (kinds.length > 0) ctx.addIssue({ code: "custom", path: [key], message: piiMessage(kinds) });
    }
  });

export type NoteField = "category" | "price" | "hospital" | "ward" | "title" | "questions" | "supplies" | "atmosphere" | "tips";
export type NoteInput = z.infer<typeof noteSchema>;
