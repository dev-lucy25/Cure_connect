import { z } from "zod";
import { todayKst, weekdaysFrom } from "@/lib/dates";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { SHIFT_KEYS, SUBJECT_KEYS } from "@/lib/subjects";
import { SKILL_KEYS, WARD_CATEGORY_KEYS } from "@/lib/skills";

// label은 조사까지 붙인 형태: { 을: "병원을", 은: "병원은" }
const text = (label: { 을: string; 은: string }, max: number) =>
  z
    .string({ error: `${label.을} 입력해 주세요` })
    .trim()
    .min(1, { error: `${label.을} 입력해 주세요` })
    .max(max, { error: `${label.은} ${max}자 이하로 입력해 주세요` });

const HOSPITAL = { 을: "병원을", 은: "병원은" };
const WARD = { 을: "병동을", 은: "병동은" };
const ACTIVITIES = { 을: "한 일을", 은: "한 일은" };

const isoDate = z.iso.date({ error: "날짜를 골라 주세요" });

const subject = z.enum(SUBJECT_KEYS, { error: "실습 과목을 골라 주세요" });
/** 듀티는 선택. 빈 칸 = null */
const shift = z.preprocess((v) => (v === "" ? null : v), z.enum(SHIFT_KEYS, { error: "듀티를 다시 골라 주세요" }).nullable());

/** 익명 통계용 선택 칸 (빈 값 = 안 고름) */
const difficulty = z.preprocess(
  (v) => (v === "" || v === undefined ? null : Number(v)),
  z.number().int().min(1).max(5, { error: "난이도를 다시 골라 주세요" }).nullable(),
);
/** 체크박스 여러 개 → 쉼표로 이은 문자열로 받아 아는 키만 남긴다 */
const hardSkills = z
  .string()
  .optional()
  .transform((v) => [...new Set((v ?? "").split(",").filter((k): k is (typeof SKILL_KEYS)[number] => (SKILL_KEYS as readonly string[]).includes(k)))]);
const wardCategory = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(WARD_CATEGORY_KEYS).nullable());

export const logSchema = z.object({
  date: isoDate.refine((d) => d <= todayKst(), { error: "앞으로의 날짜는 일지로 쓸 수 없어요" }),
  subject,
  shift,
  hospital: text(HOSPITAL, 60),
  ward: text(WARD, 60),
  hours: z
    .string()
    .trim()
    .min(1, { error: "실습 시간을 입력해 주세요" })
    .transform(Number)
    .pipe(
      z
        .number({ error: "숫자로 입력해 주세요" })
        .min(0.5, { error: "0.5시간 이상 입력해 주세요" })
        .max(24, { error: "하루 24시간을 넘을 수 없어요" })
        .refine((h) => Number.isInteger(h * 2), { error: "0.5시간 단위로 입력해 주세요" }),
    ),
  activities: text(ACTIVITIES, 2000).superRefine((value, ctx) => {
    const kinds = detectPii(value);
    if (kinds.length > 0) ctx.addIssue({ code: "custom", message: piiMessage(kinds) });
  }),
  difficulty,
  hardSkills,
  wardCategory,
});

/** 1주 일괄: 시작일부터 평일 5일 × 8시간 */
export const WEEK_DAYS = 5;
export const WEEK_DAY_HOURS = 8;

export const weekLogSchema = logSchema
  .omit({ hours: true })
  .extend({ date: isoDate })
  .superRefine((v, ctx) => {
    const last = weekdaysFrom(v.date, WEEK_DAYS).at(-1)!;
    if (last > todayKst()) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "마지막 날이 오늘 이후예요. 이미 지난 주의 첫날을 골라 주세요" });
    }
  });

/** 선택 입력. 빈 칸 = null */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label}은 ${max}자 이하로 입력해 주세요` })
    .transform((v) => v || null);

const optionalTime = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), { error: `${label}을 다시 골라 주세요` })
    .transform((v) => v || null);

/** 쉼표나 줄바꿈으로 나눈 목록 ("간경변증, 위장관출혈") */
const commaList = (label: string, maxItems: number, maxLen: number) =>
  z
    .string()
    .transform((s) =>
      s
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.string().max(maxLen, { error: `${label} 하나는 ${maxLen}자 이하로 써 주세요` }))
        .max(maxItems, { error: `${label}은 ${maxItems}개까지 쓸 수 있어요` }),
    );

// 실습 일정. 병원·병동·시작일만 필수, 나머지 병동 정보(D-Day 카드에 보이는 것)는 선택
export const scheduleSchema = z
  .object({
    hospital: text(HOSPITAL, 60),
    ward: text(WARD, 60),
    startDate: isoDate,
    endDate: z.union([z.literal("").transform(() => null), isoDate]),
    subject: z.preprocess((v) => (v === "" ? null : v), subject.nullable()),
    department: optionalText("진료과", 30),
    shift,
    shiftStart: optionalTime("근무 시작 시각"),
    shiftEnd: optionalTime("근무 끝 시각"),
    meetingPlace: optionalText("집결 장소", 80),
    meetingTime: optionalTime("집결 시각"),
    preceptor: optionalText("담당 수간호사", 40),
    commonDiseases: commaList("다빈도 질환", 6, 30),
    groupName: optionalText("조", 20),
    teammates: commaList("조원", 10, 20),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "종료일은 시작일과 같거나 뒤여야 해요" });
    }
  });

export const goalSchema = z.object({
  goalHours: z.coerce
    .number({ error: "목표 시간을 입력해 주세요" })
    .int({ error: "시간 단위로 입력해 주세요" })
    .min(100, { error: "100시간 이상으로 정해 주세요" })
    .max(3000, { error: "3000시간 이하로 정해 주세요" }),
});

export type LogField = keyof z.infer<typeof logSchema>;
export type ScheduleField = keyof z.infer<typeof scheduleSchema>;

export { idSchema, type FormState } from "@/lib/validation/form";
