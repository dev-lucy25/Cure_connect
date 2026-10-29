"use client";

import Link from "next/link";
import { loginHref } from "@/lib/safe-next";
import { useActionState, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { deleteNoteAction, rateNoteAction, unlockNoteAction, updateNoteAction, type NoteFormState, type UnlockState } from "@/server/notes-actions";
import type { NoteCard as NoteCardData } from "@/server/notes-repo";
import type { FormState } from "@/lib/validation/form";
import { categoryLabel } from "@/lib/credits";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import Button from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import Modal from "@/components/ui/modal";
import RowActions from "@/components/tracker/row-actions";
import NoteForm from "@/components/notes/note-form";

// 잠긴 시크릿 자리의 흐린 줄. 본문과 무관한 고정 모양이라 블러를 풀어도 내용이 없다 (진짜 내용은 서버가 보내지 않음)
const FAKE_LINES = ["w-11/12", "w-4/5", "w-3/5", "w-5/6"];

export default function NoteCard({
  note,
  viewer,
  onInsufficient,
}: {
  note: NoteCardData;
  /** 손님은 로그인 안내, 교수는 "학생만 열 수 있어요" */
  viewer: "guest" | "student" | "professor";
  /** 크레딧이 모자라 못 열었을 때 (충전소 열기) */
  onInsufficient: () => void;
}) {
  const [unlock, unlockAction, unlocking] = useActionState<UnlockState, FormData>(unlockNoteAction, {});
  const [edit, editAction, editing] = useActionState<NoteFormState, FormData>(updateNoteAction, {});
  const [del, delAction, deleting] = useActionState<FormState<never>, FormData>(deleteNoteAction, {});
  const [editOpenAt, setEditOpenAt] = useState<number | null>(null);
  const editOpen = editOpenAt !== null && !(edit.savedAt && edit.savedAt > editOpenAt);

  // 크레딧 부족 → 충전소 (응답마다 한 번)
  useEffect(() => {
    if (unlock.insufficient) onInsufficient();
  }, [unlock, onInsufficient]);

  return (
    <article className="flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-soft" aria-label={note.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip tone="brand" className="max-w-full truncate text-caption">
          {note.hospital} · {note.ward}
        </Chip>
        <span className="text-body-sm font-bold text-warn-ink">
          {note.rating !== null ? `★ ${note.rating.toFixed(1)}` : "☆ 평가 없음"}
          <span className="ml-1 font-normal text-ink-soft">({note.salesCount.toLocaleString()}명 열람)</span>
        </span>
      </div>
      <h3 className="mt-2 text-title font-bold break-words text-ink">{note.title}</h3>
      <p className="mt-0.5 text-caption text-ink-soft">
        {note.mine ? "내 족보" : note.authorLabel} · {categoryLabel(note.category)} · {note.price === 0 ? "무료" : `${note.price} C`}
      </p>

      {/* 무료 맛보기 */}
      {(note.public.supplies.length > 0 || note.public.atmosphere) && (
        <div className="mt-3 rounded-control bg-subtle px-3 py-2.5 text-body-sm text-ink">
          <b>💡 분위기 & 준비물: </b>
          {[note.public.atmosphere, note.public.supplies.join(", ")].filter(Boolean).join(" · ")}
        </div>
      )}

      {/* 시크릿: 열림 → 내용이 블러에서 또렷하게 / 잠김 → 가짜 흐린 줄 + 잠금 해제 */}
      <div className="relative mt-3 flex-1 overflow-hidden rounded-control border border-line p-3.5">
        <AnimatePresence initial={false} mode="wait">
          {note.open && note.secret ? (
            <motion.div
              key="open"
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ ...SPRING_SOFT, filter: { duration: 0.5 } }}
              className="space-y-2 text-body-sm text-ink"
            >
              <p className="font-bold text-warn-ink">🔑 시크릿 족보</p>
              {note.secret.questions.length > 0 && (
                <div>
                  <p className="text-caption font-bold text-ink-soft">자주 받은 질문</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {note.secret.questions.map((q, i) => (
                      <li key={i} className="break-words">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {note.secret.tips.length > 0 && (
                <div>
                  <p className="text-caption font-bold text-ink-soft">꿀팁</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {note.secret.tips.map((t, i) => (
                      <li key={i} className="break-words">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="locked" exit={{ opacity: 0 }} className="relative min-h-28">
              <div aria-hidden className="space-y-2.5 blur-[3px]">
                {FAKE_LINES.map((w) => (
                  <div key={w} className={`h-3.5 rounded-full bg-line ${w}`} />
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/40 text-center">
                <p className="text-body-sm font-bold text-ink">🔒 선배가 남긴 시크릿 질문 & 꿀팁</p>
                {viewer === "student" ? (
                  <form action={unlockAction}>
                    <input type="hidden" name="id" value={note.id} />
                    <Button type="submit" disabled={unlocking} className="min-h-11 px-4 text-body-sm">
                      {unlocking ? "여는 중..." : `💎 ${note.price} 크레딧으로 잠금 해제`}
                    </Button>
                  </form>
                ) : viewer === "guest" ? (
                  <Link href={loginHref("/notes")} className={`${buttonClass("primary")} min-h-11 px-4 text-body-sm`}>
                    로그인하고 열기
                  </Link>
                ) : (
                  <p className="rounded-full bg-surface px-3 py-1.5 text-caption font-bold text-ink-soft">학생 계정만 크레딧으로 열 수 있어요</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <FormStatus message={unlock.insufficient ? undefined : unlock.message} />
      <FormStatus savedAt={unlock.savedAt} savedText="잠금을 풀었어요 🔓" />

      {/* 평점(열람한 사람) / 내 족보 고치기·지우기 */}
      {note.mine ? (
        <div className="mt-2 flex items-center justify-end">
          <FormStatus message={del.message} />
          <RowActions id={note.id} onEdit={() => setEditOpenAt(Date.now())} deleteAction={delAction} deleting={deleting} />
        </div>
      ) : (
        note.open && viewer === "student" && <RatingStars noteId={note.id} myRating={note.myRating} />
      )}

      {note.mine && note.secret && (
        <Modal open={editOpen} onClose={() => setEditOpenAt(null)} title="✏️ 족보 고치기">
          <NoteForm
            action={editAction}
            state={edit}
            pending={editing}
            initial={{ id: note.id, category: note.category, price: note.price, hospital: note.hospital, ward: note.ward, title: note.title, ...note.public, ...note.secret }}
            onCancel={() => setEditOpenAt(null)}
          />
        </Modal>
      )}
      <FormStatus savedAt={edit.savedAt} savedText="족보를 고쳤어요" />
    </article>
  );
}

/** 별 5개. 누르면 바로 저장되고, 고른 별까지 톡 튀며 채워진다 */
function RatingStars({ noteId, myRating }: { noteId: string; myRating: number | null }) {
  const [state, action, pending] = useActionState<FormState<never>, FormData>(rateNoteAction, {});
  const tap = useTapEffect(0.85);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-1">
      <input type="hidden" name="id" value={noteId} />
      <span className="mr-1 text-caption text-ink-soft">{myRating ? "내 평점" : "평가하기"}</span>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = myRating !== null && n <= myRating;
        return (
          <motion.button
            key={n}
            type="submit"
            name="score"
            value={n}
            disabled={pending}
            aria-label={`${n}점`}
            aria-pressed={myRating === n}
            whileTap={tap}
            animate={{ scale: filled ? 1 : 0.92 }}
            transition={SPRING_SNAPPY}
            className={`grid size-9 place-items-center text-title ${filled ? "text-warn-ink" : "text-line hover:text-warn-ink/60"}`}
          >
            ★
          </motion.button>
        );
      })}
      <FormStatus message={state.message} />
    </form>
  );
}
