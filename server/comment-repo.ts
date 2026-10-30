import "server-only";
import { db } from "@/lib/db";
import { avatarUrl } from "@/lib/avatar";
import { notify, type NotificationInput } from "@/server/notification-repo";
import type { CommentInput } from "@/lib/validation/comments";

// 족보 댓글 DB 처리. viewerId/userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.
// 화면으로는 사용자 id·실명을 보내지 않는다: 익명은 족보마다 "익명 N", 닉네임은 그 닉네임과 프로필 사진만.
// 2단 구조: 원댓글 + 답글(parentId = 원댓글). 답글의 답글도 같은 원댓글 아래에 두고 replyToId로 @멘션한다.

export const COMMENT_LIMIT = 300;
/** 1분에 쓸 수 있는 댓글 수 (도배 방지) */
const PER_MINUTE = 5;

export type CommentAuthor = {
  label: string;
  anonymous: boolean;
  /** 닉네임 댓글만 프로필 사진(없으면 null → 거북이). 익명은 항상 null */
  avatarUrl: string | null;
  /** 이 족보를 쓴 사람 */
  noteAuthor: boolean;
  mine: boolean;
};

export type CommentItem = {
  id: string;
  parentId: string | null;
  /** 답글의 답글이면 "@익명 2" 같은 대상 이름 */
  replyTo: string | null;
  body: string;
  createdAt: string;
  edited: boolean;
  /** 답글이 남아 있어 자리만 남긴 원댓글 */
  deleted: boolean;
  likeCount: number;
  liked: boolean;
  author: CommentAuthor | null;
};

export type CommentThread = {
  noteId: string;
  noteTitle: string;
  total: number;
  roots: (CommentItem & { replies: CommentItem[] })[];
};

const sendable = {
  id: true,
  status: true,
  title: true,
  authorId: true,
} as const;

/** 한 족보의 댓글 전부 (원댓글 + 답글). 없는·숨긴 족보면 null */
export async function listComments(
  noteId: string,
  viewerId: string,
): Promise<CommentThread | null> {
  const note = await db.wardNote.findUnique({
    where: { id: noteId },
    select: sendable,
  });
  if (!note || note.status !== "published") return null;
  const rows = await db.noteComment.findMany({
    where: { noteId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: COMMENT_LIMIT,
    select: {
      id: true,
      userId: true,
      parentId: true,
      replyToId: true,
      body: true,
      anonymous: true,
      nickname: true,
      likeCount: true,
      editedAt: true,
      deletedAt: true,
      createdAt: true,
      user: { select: { avatar: { select: { id: true } } } },
    },
  });
  const liked = new Set(
    (
      await db.noteCommentLike.findMany({
        where: { userId: viewerId, commentId: { in: rows.map((r) => r.id) } },
        select: { commentId: true },
      })
    ).map((l) => l.commentId),
  );

  // 익명 번호: 이 족보에서 처음 익명으로 쓴 순서대로 사람마다 고정 (작성자는 번호 없이 "익명" + 작성자 배지)
  const anonNo = new Map<string, number>();
  for (const r of rows)
    if (r.anonymous && r.userId !== note.authorId && !anonNo.has(r.userId))
      anonNo.set(r.userId, anonNo.size + 1);
  const labelOf = (r: (typeof rows)[number]) =>
    r.anonymous
      ? r.userId === note.authorId
        ? "익명"
        : `익명 ${anonNo.get(r.userId)}`
      : r.nickname!;
  const byId = new Map(rows.map((r) => [r.id, r]));

  const items: CommentItem[] = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    replyTo:
      r.replyToId &&
      r.replyToId !== r.parentId &&
      byId.get(r.replyToId) &&
      !byId.get(r.replyToId)!.deletedAt
        ? labelOf(byId.get(r.replyToId)!)
        : null,
    body: r.deletedAt ? "" : r.body,
    createdAt: r.createdAt.toISOString(),
    edited: r.editedAt !== null,
    deleted: r.deletedAt !== null,
    likeCount: r.likeCount,
    liked: liked.has(r.id),
    author: r.deletedAt
      ? null
      : {
          label: labelOf(r),
          anonymous: r.anonymous,
          avatarUrl: r.anonymous ? null : avatarUrl(r.user.avatar?.id),
          noteAuthor: r.userId === note.authorId,
          mine: r.userId === viewerId,
        },
  }));
  const roots = items
    .filter((c) => c.parentId === null)
    .map((c) => ({ ...c, replies: items.filter((r) => r.parentId === c.id) }));
  return {
    noteId,
    noteTitle: note.title,
    total: items.filter((c) => !c.deleted).length,
    roots,
  };
}

export type CommentTarget = { parentId?: string; replyToId?: string };
export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_found" | "bad_parent" | "too_fast" };

export async function createComment(
  userId: string,
  noteId: string,
  input: CommentInput,
  target: CommentTarget,
): Promise<CreateResult> {
  return db.$transaction(async (tx) => {
    const note = await tx.wardNote.findUnique({
      where: { id: noteId },
      select: sendable,
    });
    if (!note || note.status !== "published")
      return { ok: false, reason: "not_found" };

    // 답글: 원댓글은 같은 족보의 지워지지 않은 원댓글, @대상은 같은 줄기 안의 댓글
    let parent: { id: string; userId: string } | null = null;
    let replyTo: { id: string; userId: string } | null = null;
    if (target.parentId) {
      parent = await tx.noteComment.findFirst({
        where: { id: target.parentId, noteId, parentId: null, deletedAt: null },
        select: { id: true, userId: true },
      });
      if (!parent) return { ok: false, reason: "bad_parent" };
      if (target.replyToId && target.replyToId !== parent.id) {
        replyTo = await tx.noteComment.findFirst({
          where: { id: target.replyToId, parentId: parent.id, deletedAt: null },
          select: { id: true, userId: true },
        });
        if (!replyTo) return { ok: false, reason: "bad_parent" };
      }
    }

    const recent = await tx.noteComment.count({
      where: { userId, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recent >= PER_MINUTE) return { ok: false, reason: "too_fast" };

    const created = await tx.noteComment.create({
      data: {
        noteId,
        userId,
        parentId: parent?.id ?? null,
        replyToId: replyTo?.id ?? parent?.id ?? null,
        body: input.body,
        anonymous: input.anonymous,
        nickname: input.nickname,
      },
      select: { id: true },
    });
    if (parent)
      await tx.noteComment.update({
        where: { id: parent.id },
        data: { replyCount: { increment: 1 } },
        select: { id: true },
      });
    if (input.nickname)
      await tx.profile.update({
        where: { id: userId },
        data: { nickname: input.nickname },
        select: { id: true },
      });

    // 알림: 원댓글 → 족보 작성자 / 답글 → 원댓글·@대상 작성자 (나 자신은 빼고, 사람마다 한 번)
    const who = input.anonymous
      ? userId === note.authorId
        ? "족보 작성자"
        : "익명"
      : input.nickname;
    const preview =
      input.body.length > 60 ? `${input.body.slice(0, 60)}…` : input.body;
    const link = `/notes?comments=${noteId}`;
    const send = new Map<string, NotificationInput>();
    if (!parent && note.authorId !== userId) {
      send.set(note.authorId, {
        userId: note.authorId,
        kind: "note_comment",
        title: "내 족보에 새 댓글",
        body: `${who}: ${preview}`,
        link,
      });
    }
    for (const t of [parent, replyTo]) {
      if (t && t.userId !== userId && !send.has(t.userId)) {
        send.set(t.userId, {
          userId: t.userId,
          kind: "comment_reply",
          title: "내 댓글에 답글",
          body: `${who}: ${preview}`,
          link,
        });
      }
    }
    await notify([...send.values()], tx);
    return { ok: true, id: created.id };
  });
}

/** 내 댓글 고치기 (지운 댓글은 못 고친다). 고친 댓글의 noteId, 못 고치면 null */
export async function updateComment(
  userId: string,
  id: string,
  body: string,
): Promise<string | null> {
  const { count } = await db.noteComment.updateMany({
    where: { id, userId, deletedAt: null },
    data: { body, editedAt: new Date() },
  });
  if (count !== 1) return null;
  return (
    (
      await db.noteComment.findUnique({
        where: { id },
        select: { noteId: true },
      })
    )?.noteId ?? null
  );
}

/** 내 댓글 지우기. 답글이 달린 원댓글은 자리만 남기고, 그 밖에는 지운다. 남은 noteId를 돌려준다 */
export async function deleteComment(
  userId: string,
  id: string,
): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const c = await tx.noteComment.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true, noteId: true, parentId: true, replyCount: true },
    });
    if (!c) return null;
    if (!c.parentId && c.replyCount > 0) {
      await tx.noteComment.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true },
      });
      return c.noteId;
    }
    await tx.noteComment.delete({ where: { id }, select: { id: true } });
    if (c.parentId) {
      const parent = await tx.noteComment.update({
        where: { id: c.parentId },
        data: { replyCount: { decrement: 1 } },
        select: { replyCount: true, deletedAt: true },
      });
      // 자리만 남아 있던 원댓글의 마지막 답글이 지워지면 원댓글도 정리한다
      if (parent.deletedAt && parent.replyCount <= 0)
        await tx.noteComment.delete({
          where: { id: c.parentId },
          select: { id: true },
        });
    }
    return c.noteId;
  });
}

/** 좋아요 누르기·취소. 지운 댓글에는 못 누른다. 남은 noteId를 돌려준다 */
export async function toggleLike(
  userId: string,
  id: string,
): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const c = await tx.noteComment.findFirst({
      where: { id, deletedAt: null },
      select: { noteId: true },
    });
    if (!c) return null;
    const removed = await tx.noteCommentLike.deleteMany({
      where: { userId, commentId: id },
    });
    if (removed.count) {
      await tx.noteComment.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
        select: { id: true },
      });
    } else {
      await tx.noteCommentLike.create({ data: { userId, commentId: id } });
      await tx.noteComment.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
        select: { id: true },
      });
    }
    return c.noteId;
  });
}
