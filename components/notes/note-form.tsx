"use client";

import { useState } from "react";
import type { NoteFormState } from "@/server/notes-actions";
import { NOTE_CATEGORIES, NOTE_PRICES, REWARD_MIN_LINES, UPLOAD_REWARD } from "@/lib/credits";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import SelectField from "@/components/ui/select-field";
import TextareaField from "@/components/ui/textarea-field";
import Segmented from "@/components/ui/segmented";

export type NoteInitial = {
  id: string;
  category: string;
  price: number;
  hospital: string;
  ward: string;
  title: string;
  questions: string[];
  supplies: string[];
  atmosphere: string;
  tips: string[];
};

// 족보 쓰기·고치기 폼 (모달 안). 무료 맛보기(제목·준비물·분위기)와 🔒 시크릿(질문·팁)을 나눠 받는다.
// 목록 칸은 "한 줄에 하나씩". 저장 처리(useActionState)는 부모가 들고 있다.
export default function NoteForm({
  action,
  state,
  pending,
  initial,
  rewardAvailable,
  onCancel,
}: {
  action: (formData: FormData) => void;
  state: NoteFormState;
  pending: boolean;
  initial?: NoteInitial;
  /** 오늘 등록 보상을 받을 수 있는지 (새 족보일 때 안내) */
  rewardAvailable?: boolean;
  onCancel: () => void;
}) {
  const v = state.values;
  const errors = state.fieldErrors ?? {};
  const [price, setPrice] = useState(v?.price ?? String(initial?.price ?? 300));
  const p = initial ? `n-${initial.id}-` : "n-new-";
  const lines = (list?: string[]) => list?.join("\n") ?? "";

  return (
    <form action={action} noValidate className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {!initial && (
        <p className="rounded-control bg-brand-soft px-3 py-2.5 text-body-sm text-brand-deep">
          💡{" "}
          {rewardAvailable
            ? `등록하면 +${UPLOAD_REWARD} C가 바로 적립되고, 후배가 열람할 때마다 가격의 80%가 적립돼요 (시크릿 ${REWARD_MIN_LINES}줄 이상)`
            : "오늘 등록 보상은 이미 받았어요. 후배가 열람할 때마다 가격의 80%는 계속 적립돼요"}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${p}hospital`}
          name="hospital"
          label="실습 병원"
          placeholder="예: 동의의료원"
          defaultValue={v?.hospital ?? initial?.hospital}
          error={errors.hospital}
        />
        <Field
          id={`${p}ward`}
          name="ward"
          label="병동"
          placeholder="예: 61병동 (외과)"
          defaultValue={v?.ward ?? initial?.ward}
          error={errors.ward}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id={`${p}category`}
          name="category"
          label="실습 과목 분류"
          placeholder="분류 선택"
          defaultValue={v?.category ?? initial?.category ?? ""}
          error={errors.category}
          options={NOTE_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
        />
        <Segmented
          name="price"
          legend="열람 가격"
          value={price}
          onChange={setPrice}
          error={errors.price}
          options={NOTE_PRICES.map((n) => ({ value: String(n), label: n === 0 ? "무료" : `${n} C` }))}
        />
      </div>

      <section className="space-y-3 rounded-control border border-line p-3">
        <h3 className="text-body-sm font-bold text-ink">👀 무료 맛보기 (누구나 보여요)</h3>
        <Field
          id={`${p}title`}
          name="title"
          label="한 줄 요약 제목"
          placeholder="예: 수술 전후 간호 핵심 루틴 & 수간호사님 단골 질문"
          maxLength={80}
          defaultValue={v?.title ?? initial?.title}
          error={errors.title}
        />
        <TextareaField
          id={`${p}supplies`}
          name="supplies"
          label="필수 준비물 (한 줄에 하나씩)"
          rows={3}
          placeholder={"포셉\n3색 볼펜"}
          defaultValue={v?.supplies ?? lines(initial?.supplies)}
          error={errors.supplies}
        />
        <TextareaField
          id={`${p}atmosphere`}
          name="atmosphere"
          label="병동 분위기"
          rows={2}
          placeholder="예: Day 출근 6시 40분까지 도착 권장, 조용한 분위기"
          maxLength={500}
          defaultValue={v?.atmosphere ?? initial?.atmosphere}
          error={errors.atmosphere}
        />
      </section>

      <section className="space-y-3 rounded-control border border-warn-line bg-warn-bg/40 p-3">
        <h3 className="text-body-sm font-bold text-warn-ink">
          🔒 시크릿 족보 ({price === "0" ? "무료로 공개" : "크레딧으로 열람 시 공개"})
        </h3>
        <TextareaField
          id={`${p}questions`}
          name="questions"
          label="자주 받은 질문 (한 줄에 하나씩)"
          rows={4}
          placeholder={"첫날 OT 때 항생제 AST 판독 기준 물어보심\n락툴로오스 관장 이유"}
          defaultValue={v?.questions ?? lines(initial?.questions)}
          error={errors.questions}
        />
        <TextareaField
          id={`${p}tips`}
          name="tips"
          label="꿀팁 (한 줄에 하나씩)"
          rows={3}
          placeholder={"오후 2시 바이탈 때 혈당기 스트립 챙기기"}
          defaultValue={v?.tips ?? lines(initial?.tips)}
          error={errors.tips}
        />
      </section>

      <p className="text-caption text-ink-soft">환자 이름·등록번호 같은 식별 정보는 쓰지 마세요. 저장할 때 다시 확인해요.</p>
      <FormStatus message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "저장 중..." : initial ? "고치기" : `등록하기`}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
