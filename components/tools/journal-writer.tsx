"use client";

import { useActionState, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { deleteJournalAction, draftJournalAction, saveJournalAction, type JournalDraftState } from "@/server/learning-actions";
import type { JournalItem } from "@/server/learning-repo";
import type { FormState } from "@/lib/validation/form";
import type { JournalField } from "@/lib/validation/learning";
import { shortDate } from "@/lib/dates";
import { SPRING_SOFT } from "@/lib/motion";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import TextareaField from "@/components/ui/textarea-field";
import RowActions from "@/components/tracker/row-actions";
import { WalkingTurtle } from "@/components/ui/skeleton";

// AI 실습일지: 날짜·병동·오늘 메모 → (AI 초안 만들기) → 아래 일지 칸에서 고쳐 저장. AI 없이 직접 써도 된다
export default function JournalWriter({ items, today, left }: { items: JournalItem[]; today: string; left: number }) {
  const [editing, setEditing] = useState<JournalItem | null>(null);
  return (
    <div className="space-y-4">
      <Editor key={editing?.id ?? "new"} initial={editing} today={today} left={left} onDone={() => setEditing(null)} />
      <section aria-labelledby="journal-list" className="space-y-2">
        <h2 id="journal-list" className="text-title font-bold">
          저장한 실습일지 <span className="text-body-sm font-medium text-ink-soft">({items.length})</span>
        </h2>
        {items.length === 0 ? (
          <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-body-sm text-ink-soft shadow-soft">
            아직 저장한 일지가 없어요
          </p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((j) => (
                <JournalRow key={j.id} item={j} onEdit={() => (setEditing(j), window.scrollTo({ top: 0, behavior: "smooth" }))} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}

function Editor({ initial, today, left, onDone }: { initial: JournalItem | null; today: string; left: number; onDone: () => void }) {
  const [draftState, draftAction, drafting] = useActionState<JournalDraftState, FormData>(draftJournalAction, {});
  const [saveState, saveAction, saving] = useActionState<FormState<JournalField>, FormData>(saveJournalAction, {});
  const [content, setContent] = useState(initial?.content ?? "");
  // AI 초안이 오면 일지 칸에 넣는다 (사용자가 고칠 수 있음)
  const [lastDraft, setLastDraft] = useState<string | undefined>(undefined);
  if (draftState.draft && draftState.draft !== lastDraft) {
    setLastDraft(draftState.draft);
    setContent(draftState.draft);
  }
  useEffect(() => {
    if (saveState.savedAt && initial) onDone();
  }, [saveState.savedAt, initial, onDone]);
  const v = saveState.values ?? draftState.values;
  const errors = { ...draftState.fieldErrors, ...saveState.fieldErrors };

  return (
    <Card>
      <h2 className="text-title font-bold text-ink">{initial ? "실습일지 고치기" : "✍️ 오늘 실습일지"}</h2>
      <form className="mt-3 space-y-3" action={saveAction}>
        {initial && <input type="hidden" name="id" value={initial.id} />}
        <div className="grid grid-cols-2 gap-3">
          <Field
            name="date"
            label="실습 날짜"
            type="date"
            max={today}
            defaultValue={v?.date ?? initial?.date ?? today}
            error={errors.date}
          />
          <Field name="ward" label="병동" placeholder="예: 내과병동" defaultValue={v?.ward ?? initial?.ward ?? ""} error={errors.ward} />
        </div>
        <TextareaField
          name="memo"
          label="오늘 관찰·수행한 간호 메모"
          rows={3}
          maxLength={1000}
          placeholder="예: 혈당 검사 관찰, 활력징후 측정함. 무균술 준비 중 손위생 시점을 놓칠 뻔함"
          defaultValue={v?.memo ?? initial?.memo ?? ""}
          error={errors.memo}
        />
        <Button type="submit" formAction={draftAction} variant="secondary" block disabled={drafting || left === 0}>
          {drafting
            ? "초안 만드는 중..."
            : left === 0
              ? "오늘 AI는 다 썼어요 (직접 쓸 수 있어요)"
              : `🪄 AI로 일지 초안 만들기 (오늘 ${left}회 남음)`}
        </Button>
        {drafting && <WalkingTurtle label="일지 초안을 쓰고 있어요" />}
        <FormStatus message={draftState.message} />
        <TextareaField
          name="content"
          label="실습일지 (직접 고쳐서 저장)"
          rows={12}
          maxLength={4000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          error={errors.content}
          placeholder={"1. 오늘 실습 내용\n2. 새롭게 배운 점\n3. 어려웠던 점 · 개선할 점\n4. 다음 실습 목표"}
        />
        <FormStatus message={saveState.message} savedAt={saveState.savedAt} savedText={saveState.notice} />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "저장 중..." : "일지 저장"}
          </Button>
          {initial && (
            <Button type="button" variant="ghost" onClick={onDone}>
              취소
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function JournalRow({ item, onEdit }: { item: JournalItem; onEdit: () => void }) {
  const [del, delAction, deleting] = useActionState<FormState<never>, FormData>(deleteJournalAction, {});
  const [open, setOpen] = useState(false);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING_SOFT}
      className="rounded-card border border-line bg-surface p-4 shadow-soft"
      data-journal
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 text-left" aria-expanded={open}>
          <p className="font-bold text-ink">
            {shortDate(item.date)} · {item.ward}
          </p>
          <p className={`mt-1 text-body-sm break-words whitespace-pre-line text-ink-soft ${open ? "" : "line-clamp-2"}`}>{item.content}</p>
        </button>
        <RowActions id={item.id} onEdit={onEdit} deleteAction={delAction} deleting={deleting} />
      </div>
      <FormStatus message={del.message} />
    </motion.li>
  );
}
