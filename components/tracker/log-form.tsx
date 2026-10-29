"use client";

import { useState } from "react";
import type { FormState, LogField } from "@/lib/validation/practice";
import type { LogItem } from "@/server/practice-repo";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { SHIFTS, SUBJECTS } from "@/lib/subjects";
import { shortDate, weekdaysFrom } from "@/lib/dates";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import SelectField from "@/components/ui/select-field";
import TextareaField from "@/components/ui/textarea-field";
import ChoiceChips from "@/components/ui/choice-chips";
import Expandable from "@/components/motion/expandable";
import { DIFFICULTY_LABELS, SKILLS, WARD_CATEGORIES } from "@/lib/skills";

const HOUR_PRESETS = [
  { hours: "8", label: "8시간 (1일)" },
  { hours: "9", label: "9시간" },
  { hours: "4", label: "4시간 (반일)" },
];

// 일지 쓰기·고치기 공용 폼. 저장 처리(useActionState)는 부모가 들고 있다.
export default function LogForm({
  action,
  state,
  pending,
  today,
  initial,
  onCancel,
}: {
  action: (formData: FormData) => void;
  state: FormState<LogField>;
  pending: boolean;
  today: string;
  initial?: LogItem;
  onCancel: () => void;
}) {
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  // 한 일 칸은 입력하는 동안 환자 식별 정보를 바로 안내하려고 직접 상태로 관리한다
  const [activities, setActivities] = useState(v?.activities ?? initial?.activities ?? "");
  const pii = detectPii(activities);
  // 시간은 빠른 선택 버튼으로도 채우므로 직접 상태로 관리한다
  const [hours, setHours] = useState(String(v?.hours ?? initial?.hours ?? 8));
  // 1주 일괄(평일 5일 × 8시간)은 새 일지에서만 고를 수 있다
  const [week, setWeek] = useState(false);
  const [date, setDate] = useState(v?.date ?? initial?.date ?? today);
  const weekDays = week && date ? weekdaysFrom(date, 5) : [];
  // "오늘 어땠나요?"(선택): 고친 일지에 값이 있으면 펼친 채로
  const hasReflection = Boolean(initial?.difficulty || initial?.hardSkills.length || initial?.wardCategory);
  const [reflect, setReflect] = useState(hasReflection);
  const p = initial ? `l-${initial.id}-` : "l-new-";

  return (
    <form action={action} noValidate className="space-y-3 rounded-card border border-line/70 bg-surface p-4 shadow-soft">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {week && <input type="hidden" name="bulk" value="week" />}
      <div className="grid grid-cols-2 gap-3">
        <Field
          id={`${p}date`}
          name="date"
          label={week ? "시작일" : "날짜"}
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
        {week ? (
          <div>
            <p className="mb-1.5 text-body-sm font-bold text-ink">실습 시간</p>
            <p className="flex min-h-(--size-touch) items-center rounded-control bg-subtle px-4 text-body font-bold text-ink">40시간</p>
          </div>
        ) : (
          <Field
            id={`${p}hours`}
            name="hours"
            label="실습 시간"
            type="number"
            inputMode="decimal"
            min={0.5}
            max={24}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            error={errors.hours}
          />
        )}
      </div>
      {week && weekDays.length === 5 && (
        <p className="rounded-control bg-brand-soft px-4 py-2.5 text-body-sm text-brand-deep">
          평일 5일에 8시간씩 기록돼요: {shortDate(weekDays[0])} ~ {shortDate(weekDays[4])}
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="실습 시간 빠른 선택">
        {HOUR_PRESETS.map((preset) => (
          <button
            key={preset.hours}
            type="button"
            aria-pressed={!week && hours === preset.hours}
            onClick={() => {
              setWeek(false);
              setHours(preset.hours);
            }}
            className={`press min-h-11 rounded-full px-4 text-body-sm font-bold ${
              !week && hours === preset.hours ? "bg-brand text-ink" : "bg-subtle text-ink-soft hover:text-ink"
            }`}
          >
            {preset.label}
          </button>
        ))}
        {!initial && (
          <button
            type="button"
            aria-pressed={week}
            onClick={() => setWeek(true)}
            className={`press min-h-11 rounded-full px-4 text-body-sm font-bold ${
              week ? "bg-brand text-ink" : "bg-subtle text-ink-soft hover:text-ink"
            }`}
          >
            40시간 (1주 일괄)
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField id={`${p}subject`} name="subject" label="실습 과목" defaultValue={v?.subject ?? initial?.subject ?? ""} error={errors.subject}>
          <option value="" disabled>
            과목 선택
          </option>
          {SUBJECTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SelectField>
        <SelectField id={`${p}shift`} name="shift" label="듀티 (선택)" defaultValue={v?.shift ?? initial?.shift ?? ""} error={errors.shift}>
          <option value="">선택 안 함</option>
          {SHIFTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${p}hospital`}
          name="hospital"
          label="병원"
          placeholder="예: 한빛대학교병원"
          defaultValue={v?.hospital ?? initial?.hospital}
          error={errors.hospital}
        />
        <Field
          id={`${p}ward`}
          name="ward"
          label="병동"
          placeholder="예: 71병동 (내과)"
          defaultValue={v?.ward ?? initial?.ward}
          error={errors.ward}
        />
      </div>
      <TextareaField
        id={`${p}activities`}
        name="activities"
        label="한 일"
        placeholder="예: V/S 측정, I/O 체크, 투약 참관"
        maxLength={2000}
        value={activities}
        onChange={(e) => setActivities(e.target.value)}
        hint={pii.length > 0 && !errors.activities ? `⚠️ ${piiMessage(pii)}` : undefined}
        error={errors.activities}
      />
      <div className="rounded-control bg-subtle/60 px-3 py-2">
        <button
          type="button"
          aria-expanded={reflect}
          onClick={() => setReflect((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between text-left text-body-sm font-bold text-ink"
        >
          <span>
            오늘 어땠나요? <span className="font-medium text-ink-soft">(선택)</span>
          </span>
          <span aria-hidden className={`transition-transform ${reflect ? "rotate-180" : ""}`}>
            ⌄
          </span>
        </button>
        <Expandable open={reflect}>
          <div className="space-y-4 pt-1 pb-2">
            <p className="text-caption text-ink-soft">교수님께는 이름 없이 학교·실습반 통계로만 보여요. 어디가 어려운지 교육에 반영돼요.</p>
            <ChoiceChips
              name="difficulty"
              legend="오늘 실습 난이도"
              options={[1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: `${n} · ${DIFFICULTY_LABELS[n]}` }))}
              defaultValue={v?.difficulty ?? (initial?.difficulty ? String(initial.difficulty) : null)}
            />
            <ChoiceChips
              name="hardSkills"
              legend="어려웠던 술기 (여러 개)"
              multiple
              options={SKILLS}
              defaultValue={v?.hardSkills ? v.hardSkills.split(",") : initial?.hardSkills}
            />
            <ChoiceChips
              name="wardCategory"
              legend="병동 분류"
              options={WARD_CATEGORIES}
              defaultValue={v?.wardCategory ?? initial?.wardCategory}
            />
          </div>
        </Expandable>
      </div>
      <FormStatus message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
