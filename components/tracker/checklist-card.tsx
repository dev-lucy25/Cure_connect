"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SOFT, TWEEN_POP } from "@/lib/motion";
import Collapse from "@/components/motion/collapse";
import { addChecklistItem, deleteChecklistItem, importWardChecklist, resetChecklist, setChecklistDone } from "@/server/checklist-actions";
import Link from "next/link";
import { WARD_CHECKLISTS } from "@/lib/ward-checklists";
import { PRECEPTOR_WARDS } from "@/lib/preceptor-questions";
import { WARD_CATEGORIES } from "@/lib/skills";
import ProgressBar from "@/components/motion/progress-bar";
import SelectField from "@/components/ui/select-field";
import type { ChecklistEntry } from "@/server/checklist-repo";
import type { FormState } from "@/lib/validation/form";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import IconButton from "@/components/ui/icon-button";
import { IconPlus, IconTrash } from "@/components/ui/icons";

type Change = { type: "toggle"; id: string; done: boolean } | { type: "delete"; id: string };

// 첫 출근 준비물 체크리스트: 누르면 바로 체크(낙관적 갱신) → 서버 저장 실패 시 원래대로 + 안내
export default function ChecklistCard({ items }: { items: ChecklistEntry[] }) {
  const [optimistic, apply] = useOptimistic(items, (state, change: Change) =>
    change.type === "toggle"
      ? state.map((item) => (item.id === change.id ? { ...item, done: change.done } : item))
      : state.filter((item) => item.id !== change.id),
  );
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [state, addAction, pending] = useActionState<FormState<"text">, FormData>(addChecklistItem, {});
  const doneCount = optimistic.filter((i) => i.done).length;

  function run(change: Change, request: () => Promise<boolean>) {
    setFailed(false);
    startTransition(async () => {
      apply(change);
      if (!(await request())) setFailed(true);
    });
  }

  function uncheckAll() {
    setFailed(false);
    startTransition(async () => {
      for (const item of optimistic) if (item.done) apply({ type: "toggle", id: item.id, done: false });
      if (!(await resetChecklist())) setFailed(true);
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title font-bold text-ink">🎒 첫 출근 전 준비물</h2>
        <div className="flex items-center gap-1">
          <span className="text-body-sm font-bold text-brand-deep" aria-live="polite">
            {doneCount} / {optimistic.length} 완료
          </span>
          {doneCount > 0 && (
            <Button type="button" variant="ghost" className="min-h-11 px-2 text-body-sm" onClick={uncheckAll}>
              모두 해제
            </Button>
          )}
        </div>
      </div>

      {optimistic.length > 0 && (
        <ProgressBar
          percent={Math.round((doneCount / optimistic.length) * 100)}
          label="실습 준비 달성도"
          className="mt-3 h-2 overflow-hidden rounded-full bg-subtle"
          barClassName={`h-full rounded-full ${doneCount === optimistic.length ? "bg-pink" : "bg-brand"}`}
        />
      )}
      {optimistic.length === 0 && (
        <p className="mt-3 rounded-control bg-subtle px-4 py-3 text-body-sm text-ink-soft">
          비어 있어요. 아래에서 챙길 준비물을 추가해 보세요
        </p>
      )}
      <ul className="mt-3 space-y-1">
        <AnimatePresence initial={false}>
          {optimistic.map((item) => (
            <motion.li
              key={item.id}
              layout="position"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING_SOFT}
              className="group flex items-center gap-1 overflow-hidden"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={item.done}
                onClick={() => run({ type: "toggle", id: item.id, done: !item.done }, () => setChecklistDone(item.id, !item.done))}
                className="press flex min-h-11 flex-1 items-center gap-2.5 rounded-control px-2 text-left hover:bg-subtle"
              >
                {/* 체크하면 상자가 톡 튀며 채워지고 체크 표시가 그려진다 (공용 Checkbox와 같은 모양) */}
                <motion.span
                  aria-hidden
                  animate={{ scale: item.done ? [1, 1.2, 1] : 1 }}
                  transition={TWEEN_POP}
                  className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2 transition-colors duration-200 ${
                    item.done ? "border-brand-deep bg-brand-deep text-surface" : "border-line-strong bg-surface"
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="size-3.5">
                    <motion.path
                      d="M3.5 8.5l3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ pathLength: item.done ? 1 : 0, opacity: item.done ? 1 : 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                  </svg>
                </motion.span>
                <span className={`text-body-sm ${item.done ? "text-ink-soft line-through" : "font-medium text-ink"}`}>{item.text}</span>
              </button>
              <IconButton
                label={`${item.text} 지우기`}
                tone="danger"
                onClick={() => run({ type: "delete", id: item.id }, () => deleteChecklistItem(item.id))}
              >
                <IconTrash size={16} />
              </IconButton>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {failed && <FormStatus message="저장하지 못했어요. 다시 눌러 주세요" />}

      <Collapse open={adding}>
        <form action={addAction} noValidate className="mt-3 space-y-2 px-0.5 pb-0.5">
          <Field
            name="text"
            id="checklist-text"
            label="준비물 추가"
            placeholder="예: 혈당기 스트립"
            defaultValue={state.values?.text}
            error={state.fieldErrors?.text}
            autoFocus
          />
          <FormStatus message={state.message} />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="flex-1 text-body-sm">
              {pending ? "추가 중..." : "추가"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)} className="text-body-sm">
              닫기
            </Button>
          </div>
        </form>
      </Collapse>
      {!adding && (
        <div className="mt-2">
          <Button type="button" variant="ghost" onClick={() => setAdding(true)} className="px-3 text-body-sm">
            <IconPlus size={16} /> 준비물 추가
          </Button>
        </div>
      )}
      <FormStatus savedAt={state.savedAt} savedText="추가했어요 🎒" />
      <WardImport />
    </Card>
  );
}

/** 병동별 맞춤 항목 불러오기: 병동을 고르고 누르면 그 병동 준비 항목이 내 목록에 추가된다 */
function WardImport() {
  const wards = WARD_CATEGORIES.filter((w) => WARD_CHECKLISTS[w.key]);
  const [ward, setWard] = useState<string>(wards[0]?.key ?? "");
  const [result, setResult] = useState<{ message?: string; savedAt?: number; notice?: string }>({});
  const [busy, startBusy] = useTransition();
  return (
    <div className="mt-4 border-t border-line/70 pt-3" data-ward-import>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <SelectField
            id="ward-import"
            name="ward"
            label="병동별 준비 항목 불러오기"
            value={ward}
            onValueChange={setWard}
            options={wards.map((w) => ({ value: w.key, label: w.label }))}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !ward}
          onClick={() => startBusy(async () => setResult(await importWardChecklist(ward)))}
          className="min-h-(--size-touch) shrink-0 px-4 text-body-sm"
        >
          {busy ? "불러오는 중..." : "불러오기"}
        </Button>
      </div>
      <div className="mt-2">
        <FormStatus message={result.message} savedAt={result.savedAt} savedText={result.notice} />
      </div>
      {(PRECEPTOR_WARDS as readonly string[]).includes(ward) && (
        <Link
          href={`/tools/preceptor?ward=${ward}`}
          className="mt-1 inline-flex min-h-11 items-center text-body-sm font-bold text-brand-deep hover:underline"
        >
          🩺 이 병동 프리셉터 질문 미리 연습하기 →
        </Link>
      )}
    </div>
  );
}
