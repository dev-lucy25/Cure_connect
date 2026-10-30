"use client";

import { Suspense, use, useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { addCommentAction, deleteCommentAction, editCommentAction, likeCommentAction, type CommentState } from "@/server/comment-actions";
import type { CommentItem, CommentThread } from "@/server/comment-repo";
import { COMMENT_MAX, NICKNAME_MAX } from "@/lib/validation/comments";
import { detectPii, piiMessage } from "@/lib/validation/pii";
import { timeAgo } from "@/lib/dates";
import { loginHref } from "@/lib/safe-next";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Avatar from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button-class";
import FormStatus from "@/components/ui/form-status";
import Modal from "@/components/ui/modal";
import { IconHeart, IconReply, IconSend, IconX } from "@/components/ui/icons";

// 족보 댓글 시트: 원댓글 + 답글(접고 펴기), 좋아요, 최신순·인기순, 내 댓글 고치기·지우기.
// 쓸 때 익명/닉네임을 고르고, 어떻게 보일지 미리 보여 준다. 바뀐 결과는 서버가 댓글 전체를 다시 돌려줘 그대로 그린다.

export type CommentsTarget = { noteId: string; title: string; load: Promise<{ thread?: CommentThread; message?: string }> | null };
export type Me = { nickname: string | null; avatarUrl: string | null } | null;
type Root = CommentThread["roots"][number];
type ReplyTarget = { parentId: string; replyToId: string; label: string };

const SORTS = [
  { key: "new", label: "최신순" },
  { key: "top", label: "인기순" },
] as const;

export default function NoteComments({
  target,
  me,
  onClose,
  onCount,
}: {
  target: CommentsTarget | null;
  me: Me;
  onClose: () => void;
  /** 댓글 수가 바뀌면 카드의 숫자도 바꾼다 */
  onCount: (noteId: string, count: number) => void;
}) {
  return (
    <Modal open={target !== null} onClose={onClose} title="댓글" description={target?.title}>
      {target &&
        (me && target.load ? (
          <Suspense fallback={<CommentsSkeleton />}>
            <Panel key={target.noteId} noteId={target.noteId} load={target.load} me={me} onCount={onCount} />
          </Suspense>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <NurseTurtle stage={2} mood="empty" size={72} decorative />
            <p className="mt-2 text-body font-bold text-ink">로그인하면 댓글을 보고 쓸 수 있어요</p>
            <Link href={loginHref(`/notes?comments=${target.noteId}`)} className={`${buttonClass("primary")} mt-4 px-5`}>
              로그인하기
            </Link>
          </div>
        ))}
    </Modal>
  );
}

function Panel({
  noteId,
  load,
  me,
  onCount,
}: {
  noteId: string;
  load: NonNullable<CommentsTarget["load"]>;
  me: NonNullable<Me>;
  onCount: (noteId: string, count: number) => void;
}) {
  const first = use(load);
  const [thread, setThread] = useState<CommentThread | null>(first.thread ?? null);
  const [sort, setSort] = useState<"new" | "top">("new");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [state, action, pending] = useActionState<CommentState, FormData>(addCommentAction, {});
  const [handled, setHandled] = useState<number | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  // 댓글을 쓰고 나면 (렌더 중 한 번만): 새 목록으로 바꾸고, 답글이면 그 줄기를 편다
  if (state.savedAt && state.savedAt !== handled) {
    setHandled(state.savedAt);
    if (state.thread) setThread(state.thread);
    if (replyTo) setOpen((s) => new Set(s).add(replyTo.parentId));
    setReplyTo(null);
  }

  useEffect(() => {
    if (thread) onCount(noteId, thread.total);
  }, [thread, noteId, onCount]);

  useEffect(() => {
    if (state.newId) listRef.current?.querySelector(`[data-comment="${state.newId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state.newId]);

  if (!thread) return <p className="py-8 text-center text-body-sm text-ink-soft">{first.message ?? "댓글을 불러오지 못했어요"}</p>;

  const roots = [...thread.roots].sort((a, b) =>
    sort === "top" ? b.likeCount - a.likeCount || b.replies.length - a.replies.length || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt),
  );

  // 좋아요·고치기·지우기: 서버가 돌려준 목록으로 바꾼다 (좋아요는 먼저 화면에서 바꿔 둔다)
  async function run(task: Promise<{ thread?: CommentThread; message?: string }>, rollback?: CommentThread) {
    const r = await task;
    if (r.thread) setThread(r.thread);
    else {
      if (rollback) setThread(rollback);
      setNotice(r.message ?? "잠시 후 다시 시도해 주세요");
    }
  }
  function like(id: string) {
    const before = thread!;
    const flip = (c: CommentItem) => (c.id === id ? { ...c, liked: !c.liked, likeCount: c.likeCount + (c.liked ? -1 : 1) } : c);
    setThread({ ...before, roots: before.roots.map((r) => ({ ...flip(r), replies: r.replies.map(flip) })) });
    return run(likeCommentAction(id), before);
  }
  const actions = {
    like,
    edit: (id: string, body: string) => run(editCommentAction(id, body)),
    remove: (id: string) => run(deleteCommentAction(id)),
    reply: (root: Root, c: CommentItem) => {
      setReplyTo({ parentId: root.id, replyToId: c.id, label: c.author?.label ?? "" });
      setOpen((s) => new Set(s).add(root.id));
    },
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-body-sm font-bold text-ink">
          댓글 <span className="text-brand-deep tabular-nums">{thread.total}</span>
        </p>
        <div role="radiogroup" aria-label="정렬" className="flex gap-1 rounded-full bg-subtle p-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={sort === s.key}
              onClick={() => setSort(s.key)}
              className={`relative isolate min-h-8 cursor-pointer rounded-full px-3 text-caption font-bold transition-colors ${sort === s.key ? "text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {sort === s.key && <motion.span layoutId={`sort-${noteId}`} transition={SPRING_SNAPPY} className="absolute inset-0 -z-10 rounded-full bg-surface shadow-soft" />}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={listRef} className="space-y-1">
        {roots.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <NurseTurtle stage={3} mood="empty" size={68} decorative />
            <p className="mt-2 text-body font-bold text-ink">아직 댓글이 없어요</p>
            <p className="mt-0.5 text-body-sm text-ink-soft">이 족보에 대해 궁금한 점을 먼저 물어보세요</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {roots.map((root) => (
              <motion.div key={root.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SOFT}>
                <CommentRow c={root} now={now} actions={actions} onReply={() => actions.reply(root, root)} />
                {root.replies.length > 0 && (
                  <div className="ml-[18px] border-l-2 border-line/70 pl-4">
                    <button
                      type="button"
                      onClick={() => setOpen((s) => (s.has(root.id) ? (s.delete(root.id), new Set(s)) : new Set(s).add(root.id)))}
                      aria-expanded={open.has(root.id)}
                      className="flex min-h-9 cursor-pointer items-center gap-2 text-caption font-bold text-ink-soft hover:text-ink"
                    >
                      <span aria-hidden className="h-px w-5 bg-line-strong" />
                      {open.has(root.id) ? "답글 숨기기" : `답글 ${root.replies.length}개 보기`}
                    </button>
                    <AnimatePresence initial={false}>
                      {open.has(root.id) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SOFT} className="overflow-hidden">
                          {root.replies.map((r) => (
                            <CommentRow key={r.id} c={r} now={now} small actions={actions} onReply={() => actions.reply(root, r)} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <FormStatus message={notice ?? undefined} />
      <Composer
        key={handled ?? "first"}
        noteId={noteId}
        me={me}
        action={action}
        pending={pending}
        state={state}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}

type Actions = {
  like: (id: string) => Promise<void>;
  edit: (id: string, body: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

function CommentRow({ c, now, small = false, actions, onReply }: { c: CommentItem; now: number; small?: boolean; actions: Actions; onReply: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.body);
  const [confirming, setConfirming] = useState(false);
  const [busy, startBusy] = useTransition();
  const a = c.author;

  if (c.deleted || !a) {
    return (
      <div data-comment={c.id} className="flex gap-3 py-3">
        <span aria-hidden className={`${small ? "size-7" : "size-9"} shrink-0 rounded-full bg-subtle`} />
        <p className="self-center text-body-sm text-ink-soft italic">삭제된 댓글이에요</p>
      </div>
    );
  }

  return (
    <div data-comment={c.id} className="group flex gap-3 py-3">
      <Avatar src={a.avatarUrl} muted={a.anonymous} size={small ? 28 : 36} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption">
          <span className="font-bold text-ink">{a.label}</span>
          {a.noteAuthor && <span className="rounded-full bg-brand-soft px-1.5 py-px text-[11px] font-bold text-brand-deep">작성자</span>}
          {a.mine && <span className="rounded-full bg-subtle px-1.5 py-px text-[11px] font-bold text-ink-soft">나</span>}
          <span className="text-ink-soft">
            {timeAgo(c.createdAt, now)}
            {c.edited && " · 수정됨"}
          </span>
        </p>

        {editing ? (
          <div className="mt-1.5 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={COMMENT_MAX}
              aria-label="댓글 고치기"
              className="block max-h-40 min-h-16 w-full resize-none rounded-control border border-line-strong bg-surface px-3 py-2 text-body-sm text-ink outline-none [field-sizing:content] focus:border-brand-deep focus:focus-glow"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => (setEditing(false), setDraft(c.body))} className="min-h-9 cursor-pointer rounded-full px-3 text-caption font-bold text-ink-soft hover:bg-subtle">
                취소
              </button>
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => startBusy(async () => (await actions.edit(c.id, draft), setEditing(false)))}
                className="min-h-9 cursor-pointer rounded-full bg-brand-deep px-3 text-caption font-bold text-on-inverse disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-body-sm break-words whitespace-pre-wrap text-ink">
            {c.replyTo && <span className="mr-1 font-bold text-brand-deep">@{c.replyTo}</span>}
            {c.body}
          </p>
        )}

        {!editing && (
          <div className="-ml-2 mt-1 flex flex-wrap items-center gap-0.5 text-caption font-bold text-ink-soft">
            <LikeButton liked={c.liked} count={c.likeCount} onClick={() => actions.like(c.id)} />
            <button type="button" onClick={onReply} className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-2 hover:bg-subtle hover:text-ink">
              <IconReply size={15} /> 답글
            </button>
            {a.mine &&
              (confirming ? (
                <span className="inline-flex items-center gap-1 pl-1">
                  <span className="text-danger">지울까요?</span>
                  <button type="button" disabled={busy} onClick={() => startBusy(() => actions.remove(c.id))} className="min-h-8 cursor-pointer rounded-full px-2 text-danger hover:bg-danger-soft">
                    {busy ? "지우는 중..." : "지우기"}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className="min-h-8 cursor-pointer rounded-full px-2 hover:bg-subtle">
                    취소
                  </button>
                </span>
              ) : (
                <>
                  <button type="button" onClick={() => (setDraft(c.body), setEditing(true))} className="min-h-8 cursor-pointer rounded-full px-2 hover:bg-subtle hover:text-ink">
                    수정
                  </button>
                  <button type="button" onClick={() => setConfirming(true)} className="min-h-8 cursor-pointer rounded-full px-2 hover:bg-subtle hover:text-danger">
                    삭제
                  </button>
                </>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 하트: 누르면 채워지며 톡 튄다
function LikeButton({ liked, count, onClick }: { liked: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? `좋아요 취소 (${count})` : `좋아요 (${count})`}
      className={`inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-2 hover:bg-subtle ${liked ? "text-pink-deep" : "hover:text-ink"}`}
    >
      <motion.span key={String(liked)} initial={liked ? { scale: 0.5 } : false} animate={{ scale: [null, 1.25, 1] }} transition={{ duration: 0.35 }} className="inline-flex">
        <IconHeart size={16} filled={liked} />
      </motion.span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function Composer({
  noteId,
  me,
  action,
  pending,
  state,
  replyTo,
  onCancelReply,
}: {
  noteId: string;
  me: NonNullable<Me>;
  action: (fd: FormData) => void;
  pending: boolean;
  state: CommentState;
  replyTo: ReplyTarget | null;
  onCancelReply: () => void;
}) {
  // 실패하면 서버가 돌려준 값으로 다시 채운다 (성공하면 key가 바뀌어 새로 시작)
  const failed = !state.savedAt ? state.values : undefined;
  const [anonymous, setAnonymous] = useState(failed ? failed.anonymous !== "0" : true);
  const [nickname, setNickname] = useState(failed?.nickname ?? me.nickname ?? "");
  const [body, setBody] = useState(failed?.body ?? "");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const pii = detectPii(body);
  const errors = state.savedAt ? {} : (state.fieldErrors ?? {});

  useEffect(() => {
    if (replyTo) textRef.current?.focus();
  }, [replyTo]);

  function submitOnKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
  }
  function guard(e: FormEvent<HTMLFormElement>) {
    if (!body.trim() || pii.length > 0) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={guard} className="sticky bottom-0 -mx-5 mt-2 border-t border-line bg-surface/95 px-5 pt-3 pb-1 backdrop-blur">
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="parentId" value={replyTo?.parentId ?? ""} />
      <input type="hidden" name="replyToId" value={replyTo?.replyToId ?? ""} />
      <input type="hidden" name="anonymous" value={anonymous ? "1" : "0"} />

      <AnimatePresence initial={false}>
        {replyTo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mb-2 flex items-center justify-between rounded-control bg-brand-soft px-3 py-1.5 text-caption font-bold text-brand-deep">
              <span className="inline-flex items-center gap-1">
                <IconReply size={14} /> {replyTo.label}님에게 답글
              </span>
              <button type="button" onClick={onCancelReply} aria-label="답글 취소" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-brand/30">
                <IconX size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 어떻게 보일지: 익명 / 닉네임 */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="이름 표시" className="flex gap-1 rounded-full bg-subtle p-1">
          {[
            { v: true, label: "익명" },
            { v: false, label: "닉네임" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={anonymous === o.v}
              onClick={() => setAnonymous(o.v)}
              className={`relative isolate min-h-8 cursor-pointer rounded-full px-3 text-caption font-bold ${anonymous === o.v ? "text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {anonymous === o.v && <motion.span layoutId={`who-${noteId}`} transition={SPRING_SNAPPY} className="absolute inset-0 -z-10 rounded-full bg-surface shadow-soft" />}
              {o.label}
            </button>
          ))}
        </div>
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-ink-soft">
          <Avatar src={anonymous ? null : me.avatarUrl} muted={anonymous} size={22} />
          {anonymous ? (
            <span>
              <b className="text-ink">익명</b>으로 보여요
            </span>
          ) : (
            <input
              name="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={NICKNAME_MAX}
              placeholder="닉네임"
              aria-label="닉네임"
              aria-invalid={Boolean(errors.nickname)}
              className={`h-8 w-32 rounded-full border bg-surface px-3 text-caption font-bold text-ink outline-none focus:border-brand-deep focus:focus-glow ${errors.nickname ? "border-danger" : "border-line-strong"}`}
            />
          )}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textRef}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={submitOnKey}
          maxLength={COMMENT_MAX}
          rows={1}
          placeholder={replyTo ? "답글을 남겨 보세요" : "이 족보에 대해 궁금한 점을 남겨 보세요"}
          aria-label={replyTo ? "답글" : "댓글"}
          aria-invalid={Boolean(errors.body) || pii.length > 0}
          className="block max-h-32 min-h-11 flex-1 resize-none rounded-[22px] border border-transparent bg-ink/5 px-4 py-2.5 text-body-sm text-ink outline-none [field-sizing:content] placeholder:text-ink-soft/80 focus:border-brand-deep focus:bg-surface focus:focus-glow"
        />
        <motion.button
          type="submit"
          disabled={pending || !body.trim() || pii.length > 0}
          aria-label={replyTo ? "답글 올리기" : "댓글 올리기"}
          whileTap={{ scale: 0.9 }}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-brand-deep text-on-inverse shadow-soft transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconSend size={19} />
        </motion.button>
      </div>
      <div className="min-h-5 pt-1 text-caption">
        {pii.length > 0 ? (
          <p className="text-danger">{piiMessage(pii)}</p>
        ) : errors.body || errors.nickname ? (
          <p className="text-danger">{errors.body ?? errors.nickname}</p>
        ) : (
          body.length > COMMENT_MAX - 100 && <p className="text-right text-ink-soft tabular-nums">{body.length} / {COMMENT_MAX}</p>
        )}
      </div>
      <FormStatus message={state.savedAt ? undefined : state.message} />
    </form>
  );
}

function CommentsSkeleton() {
  return (
    <div aria-label="댓글을 불러오는 중" className="space-y-4 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div aria-hidden className="skeleton size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div aria-hidden className="skeleton h-3 w-24 rounded-full" />
            <div aria-hidden className={`skeleton h-3.5 rounded-full ${i === 1 ? "w-3/5" : "w-11/12"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
