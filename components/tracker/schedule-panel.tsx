"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";
import Collapse from "@/components/motion/collapse";
import Expandable from "@/components/motion/expandable";
import { removeSchedule, saveSchedule } from "@/server/practice-actions";
import type { FormState, ScheduleField } from "@/lib/validation/practice";
import type { ScheduleItem } from "@/server/practice-repo";
import { dDayLabel, daysBetween, shortDate } from "@/lib/dates";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import SelectField from "@/components/ui/select-field";
import { SHIFT_OPTIONS, SUBJECT_OPTIONS } from "@/lib/subjects";
import FormStatus from "@/components/ui/form-status";
import { IconPlus } from "@/components/ui/icons";
import RowActions from "@/components/tracker/row-actions";
import ChoiceChips from "@/components/ui/choice-chips";

export default function SchedulePanel({ schedules, past, today }: { schedules: ScheduleItem[]; past: ScheduleItem[]; today: string }) {
  const [state, action, pending] = useActionState<FormState<ScheduleField>, FormData>(saveSchedule, {});
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);
  const adding = openedAt !== null && !(state.savedAt && state.savedAt > openedAt);

  return (
    <section aria-labelledby="schedule-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="schedule-title" className="text-title font-bold">
          실습 일정
        </h2>
        <div className="flex items-center gap-2">
          <FormStatus savedAt={state.savedAt} />
          {!adding && (
            <Button type="button" variant="secondary" onClick={() => setOpenedAt(Date.now())} className="px-4 text-body-sm">
              <IconPlus size={18} /> 일정 추가
            </Button>
          )}
        </div>
      </div>
      <Collapse open={adding}>
        <ScheduleForm action={action} state={state} pending={pending} today={today} onCancel={() => setOpenedAt(null)} />
      </Collapse>
      {/* 일정이 생기거나 지워지면 줄이 펼쳐지며 들어오고 접히며 빠진다. 비면 테두리도 숨김(empty:) */}
      <ul className="divide-y divide-line/70 overflow-hidden rounded-card border border-line/70 bg-surface shadow-soft empty:hidden">
        <AnimatePresence initial={false}>
          {schedules.map((s) => (
            <ScheduleRow key={s.id} schedule={s} today={today} />
          ))}
        </AnimatePresence>
      </ul>
      {/* 끝난 일정: 접어 두고, 펼치면 고치기·지우기 가능 */}
      {past.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={showPast}
            onClick={() => setShowPast((v) => !v)}
            className="inline-flex min-h-11 items-center text-body-sm font-bold text-ink-soft hover:text-ink"
          >
            {showPast ? "지난 일정 접기" : `지난 일정 ${past.length}개 보기`}
          </button>
          <Collapse open={showPast}>
            <ul
              className="divide-y divide-line/70 overflow-hidden rounded-card border border-line/70 bg-surface/70 shadow-soft"
              data-past-schedules
            >
              <AnimatePresence initial={false}>
                {past.map((s) => (
                  <ScheduleRow key={s.id} schedule={s} today={today} />
                ))}
              </AnimatePresence>
            </ul>
          </Collapse>
        </div>
      )}
    </section>
  );
}

function ScheduleRow({ schedule, today }: { schedule: ScheduleItem; today: string }) {
  const [state, action, pending] = useActionState<FormState<ScheduleField>, FormData>(saveSchedule, {});
  const [del, delAction, deleting] = useActionState<FormState<never>, FormData>(removeSchedule, {});
  const [editAt, setEditAt] = useState<number | null>(null);
  const editing = editAt !== null && !(state.savedAt && state.savedAt > editAt);

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING_SOFT}
      className="overflow-hidden"
    >
      {editing ? (
        <div className="p-2">
          <ScheduleForm action={action} state={state} pending={pending} today={today} initial={schedule} onCancel={() => setEditAt(null)} />
        </div>
      ) : (
        <ScheduleSummary schedule={schedule} today={today} deleteMessage={del.message} savedAt={state.savedAt}>
          <RowActions id={schedule.id} onEdit={() => setEditAt(Date.now())} deleteAction={delAction} deleting={deleting} />
        </ScheduleSummary>
      )}
    </motion.li>
  );
}

function ScheduleSummary({
  schedule,
  today,
  deleteMessage,
  savedAt,
  children,
}: {
  schedule: ScheduleItem;
  today: string;
  deleteMessage?: string;
  savedAt?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-2 pr-2 pl-4">
      <span className="w-14 shrink-0 font-display text-title text-brand-deep">{scheduleBadge(schedule, today)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">
          {schedule.kind === "academic" && <span className="mr-1 text-caption font-bold text-pink-deep">📚 학사</span>}
          {schedule.ward}
        </p>
        <p className="truncate text-body-sm text-ink-soft">
          {schedule.kind === "academic" ? schedule.prepNotes || "학사 일정" : schedule.hospital} · {shortDate(schedule.startDate)}
          {schedule.endDate && ` ~ ${shortDate(schedule.endDate)}`}
        </p>
      </div>
      <FormStatus message={deleteMessage} />
      <FormStatus savedAt={savedAt} />
      {children}
    </div>
  );
}

function ScheduleForm({
  action,
  state,
  pending,
  today,
  initial,
  onCancel,
}: {
  action: (formData: FormData) => void;
  state: FormState<ScheduleField>;
  pending: boolean;
  today: string;
  initial?: ScheduleItem;
  onCancel: () => void;
}) {
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  // 같은 화면에 폼이 여러 개 있을 수 있어 id가 겹치지 않게 접두어를 붙인다
  const p = initial ? `s-${initial.id}-` : "s-new-";
  // 병동 정보는 접어 두고, 이미 적어 둔 값이 있거나 오류가 있으면 펼친다
  const [moreOpen, setMoreOpen] = useState(initial ? hasDetails(initial) : false);
  // 실습 / 학사 일정(케이스 발표·술기 시험 등): 학사 일정은 이름·날짜·준비사항만
  const [kind, setKind] = useState<"practice" | "academic">(
    (v?.kind as "practice" | "academic" | undefined) ?? initial?.kind ?? "practice",
  );
  const academic = kind === "academic";
  const showMore = moreOpen || DETAIL_FIELDS.some((f) => errors[f]);
  return (
    <form action={action} noValidate className="space-y-3 rounded-card border border-line/70 bg-surface p-4 shadow-soft">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <ChoiceChips
        name="kind"
        legend="일정 종류"
        options={[
          { key: "practice", label: "🏥 실습" },
          { key: "academic", label: "📚 학사 일정 (발표·시험)" },
        ]}
        defaultValue={kind}
        onChange={(k) => setKind(k as "practice" | "academic")}
      />
      {academic ? (
        <>
          <input type="hidden" name="hospital" value="" />
          <Field
            id={`${p}ward`}
            name="ward"
            label="일정 이름"
            placeholder="예: 성인간호학 케이스스터디 발표"
            defaultValue={v?.ward ?? initial?.ward}
            error={errors.ward}
          />
        </>
      ) : (
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
            placeholder="예: 내과병동"
            defaultValue={v?.ward ?? initial?.ward}
            error={errors.ward}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field
          id={`${p}startDate`}
          name="startDate"
          label="시작일"
          type="date"
          defaultValue={v?.startDate ?? initial?.startDate ?? today}
          error={errors.startDate}
        />
        <Field
          id={`${p}endDate`}
          name="endDate"
          label="종료일 (선택)"
          type="date"
          defaultValue={v?.endDate ?? initial?.endDate ?? ""}
          error={errors.endDate}
        />
      </div>
      {academic ? (
        <Field
          id={`${p}prepNotes`}
          name="prepNotes"
          label="준비사항·메모 (선택)"
          placeholder="예: SOAPIE 유인물 2부 출력, 발표 10분"
          maxLength={300}
          defaultValue={v?.prepNotes ?? initial?.prepNotes ?? ""}
          error={errors.prepNotes}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              id={`${p}subject`}
              name="subject"
              label="실습 과목 (선택)"
              defaultValue={v?.subject ?? initial?.subject ?? ""}
              error={errors.subject}
              options={[{ value: "", label: "선택 안 함" }, ...SUBJECT_OPTIONS]}
            />
            <Field
              id={`${p}department`}
              name="department"
              label="진료과 (선택)"
              placeholder="예: 소화기내과"
              defaultValue={v?.department ?? initial?.department ?? ""}
              error={errors.department}
            />
          </div>
          {/* 접혀 있어도 입력칸은 남아 있어 고칠 때 기존 값이 지워지지 않는다 */}
          <div className="rounded-control bg-subtle px-3 py-1">
            <button
              type="button"
              aria-expanded={showMore}
              aria-controls={`${p}more`}
              onClick={() => setMoreOpen((open) => !open)}
              className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-body-sm font-bold text-ink"
            >
              병동 정보 더 입력하기 (근무 시간 · 집결 · 수간호사 · 질환 · 조원)
              <motion.span aria-hidden animate={{ rotate: showMore ? 180 : 0 }} transition={SPRING_SOFT} className="text-ink-soft">
                ▾
              </motion.span>
            </button>
            <Expandable open={showMore}>
              <div id={`${p}more`} className="space-y-3 pt-1 pb-2">
                <div className="grid grid-cols-3 gap-3">
                  <SelectField
                    id={`${p}shift`}
                    name="shift"
                    label="듀티"
                    defaultValue={v?.shift ?? initial?.shift ?? ""}
                    error={errors.shift}
                    options={[{ value: "", label: "-" }, ...SHIFT_OPTIONS]}
                  />
                  <Field
                    id={`${p}shiftStart`}
                    name="shiftStart"
                    label="시작"
                    type="time"
                    defaultValue={v?.shiftStart ?? initial?.shiftStart ?? ""}
                    error={errors.shiftStart}
                  />
                  <Field
                    id={`${p}shiftEnd`}
                    name="shiftEnd"
                    label="끝"
                    type="time"
                    defaultValue={v?.shiftEnd ?? initial?.shiftEnd ?? ""}
                    error={errors.shiftEnd}
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <Field
                    id={`${p}meetingPlace`}
                    name="meetingPlace"
                    label="집결 장소"
                    placeholder="예: 본관 7층 엘리베이터 앞"
                    defaultValue={v?.meetingPlace ?? initial?.meetingPlace ?? ""}
                    error={errors.meetingPlace}
                  />
                  <Field
                    id={`${p}meetingTime`}
                    name="meetingTime"
                    label="집결 시각"
                    type="time"
                    defaultValue={v?.meetingTime ?? initial?.meetingTime ?? ""}
                    error={errors.meetingTime}
                  />
                </div>
                <Field
                  id={`${p}preceptor`}
                  name="preceptor"
                  label="담당 수간호사 (현장지도자)"
                  placeholder="예: 박지영 수간호사"
                  defaultValue={v?.preceptor ?? initial?.preceptor ?? ""}
                  error={errors.preceptor}
                />
                <Field
                  id={`${p}commonDiseases`}
                  name="commonDiseases"
                  label="주요 다빈도 질환 (쉼표로 구분)"
                  placeholder="예: 간경변증, 위장관출혈, 급성췌장염"
                  defaultValue={v?.commonDiseases ?? initial?.commonDiseases.join(", ") ?? ""}
                  error={errors.commonDiseases}
                />
                <div className="grid grid-cols-[6rem_1fr] gap-3">
                  <Field
                    id={`${p}groupName`}
                    name="groupName"
                    label="조"
                    placeholder="예: 3조"
                    defaultValue={v?.groupName ?? initial?.groupName ?? ""}
                    error={errors.groupName}
                  />
                  <Field
                    id={`${p}teammates`}
                    name="teammates"
                    label="조원 (쉼표로 구분)"
                    placeholder="예: 박소연, 정민수"
                    defaultValue={v?.teammates ?? initial?.teammates.join(", ") ?? ""}
                    error={errors.teammates}
                  />
                </div>
                <Field
                  id={`${p}prepNotes`}
                  name="prepNotes"
                  label="핵심 준비사항"
                  placeholder="예: 포셉·3색 볼펜 지참, 소화기 약어 숙지"
                  maxLength={300}
                  defaultValue={v?.prepNotes ?? initial?.prepNotes ?? ""}
                  error={errors.prepNotes}
                />
              </div>
            </Expandable>
          </div>
        </>
      )}
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

const DETAIL_FIELDS = [
  "shift",
  "shiftStart",
  "shiftEnd",
  "meetingPlace",
  "meetingTime",
  "preceptor",
  "commonDiseases",
  "groupName",
  "teammates",
  "prepNotes",
] as const;

/** 일정 줄 왼쪽 표시: 다가오면 D-n, 진행 중이면 "진행", 끝났으면 "지남" */
function scheduleBadge(s: ScheduleItem, today: string) {
  const end = s.endDate ?? s.startDate;
  if (end < today) return "지남";
  if (s.startDate <= today) return "진행";
  return dDayLabel(daysBetween(today, s.startDate));
}

function hasDetails(s: ScheduleItem) {
  return Boolean(
    s.shift ||
    s.shiftStart ||
    s.shiftEnd ||
    s.meetingPlace ||
    s.meetingTime ||
    s.preceptor ||
    s.groupName ||
    s.commonDiseases.length ||
    s.teammates.length ||
    s.prepNotes,
  );
}
