import { z } from "zod";
import { todayKst } from "@/lib/dates";
import { detectPii, piiMessage } from "@/lib/validation/pii";

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

export const logSchema = z.object({
  date: isoDate.refine((d) => d <= todayKst(), { error: "앞으로의 날짜는 일지로 쓸 수 없어요" }),
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
});

export const scheduleSchema = z.object({
  hospital: text(HOSPITAL, 60),
  ward: text(WARD, 60),
  startDate: isoDate,
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
