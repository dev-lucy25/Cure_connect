"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";
import { deleteCaseAction, updateCaseAction } from "@/server/case-actions";
import type { FormState } from "@/lib/validation/form";
import type { CaseField } from "@/lib/validation/case";
import Card from "@/components/ui/card";
import FormStatus from "@/components/ui/form-status";
import CaseForm from "@/components/cases/case-form";
import RowActions from "@/components/tracker/row-actions";

// 케이스 메모 보기 · 고치기 · 지우기
export default function CaseEditor({ initial }: { initial: { id: string; title: string; ward: string; memo: string } }) {
  const [state, action, pending] = useActionState<FormState<CaseField>, FormData>(updateCaseAction, {});
  const [del, delAction, deleting] = useActionState<FormState<never>, FormData>(deleteCaseAction, {});
  const [editAt, setEditAt] = useState<number | null>(null);
  const editing = editAt !== null && !(state.savedAt && state.savedAt > editAt);

  // 보기 ↔ 고치기 폼이 자연스럽게 바뀐다
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={editing ? "edit" : "view"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={SPRING_SOFT}
      >
        {editing ? (
          <CaseForm action={action} state={state} pending={pending} initial={initial} onCancel={() => setEditAt(null)} />
        ) : (
          <Card>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-title font-bold">{initial.title}</h1>
                <p className="text-body-sm text-ink-soft">{initial.ward}</p>
              </div>
              <RowActions id={initial.id} onEdit={() => setEditAt(Date.now())} deleteAction={delAction} deleting={deleting} />
            </div>
            <h2 className="mt-4 text-caption font-bold text-ink-soft">현장 메모</h2>
            <p className="mt-1 whitespace-pre-line break-words rounded-control bg-canvas px-4 py-3 text-body-sm">{initial.memo}</p>
            <div className="mt-2 flex justify-end">
              <FormStatus message={del.message} />
              <FormStatus savedAt={state.savedAt} />
            </div>
          </Card>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
