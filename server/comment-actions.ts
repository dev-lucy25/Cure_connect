"use server";

import { updateTag } from "next/cache";
import { getOptionalUser } from "@/server/auth";
import { createComment, deleteComment, listComments, toggleLike, updateComment, type CommentThread } from "@/server/comment-repo";
import { commentBodySchema, commentSchema, type CommentField } from "@/lib/validation/comments";
import { fieldErrorsOf, idSchema } from "@/lib/validation/form";

// 족보 댓글. 로그인한 사람만 읽고 쓴다. 바꾸는 처리는 끝나면 그 족보의 댓글 전체를 다시 돌려줘 화면이 바로 맞춰진다.

export type CommentState = {
  fieldErrors?: Partial<Record<CommentField, string>>;
  message?: string;
  savedAt?: number;
  /** 방금 쓴 댓글 (화면이 그 자리로 스크롤) */
  newId?: string;
  thread?: CommentThread;
  values?: Partial<Record<CommentField | "anonymous", string>>;
};

const FAILED = "잠시 후 다시 시도해 주세요";

export async function loadComments(noteId: string): Promise<{ thread?: CommentThread; message?: string }> {
  const user = await getOptionalUser();
  if (!user) return { message: "로그인하면 댓글을 볼 수 있어요" };
  if (!idSchema.safeParse(noteId).success) return { message: "족보를 찾을 수 없어요" };
  const thread = await listComments(noteId, user.id);
  return thread ? { thread } : { message: "족보를 찾을 수 없어요" };
}

export async function addCommentAction(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const user = await getOptionalUser();
  if (!user) return { message: "로그인하고 댓글을 남겨 주세요" };
  const noteId = String(formData.get("noteId") ?? "");
  const parentId = String(formData.get("parentId") ?? "") || undefined;
  const replyToId = String(formData.get("replyToId") ?? "") || undefined;
  const values = {
    body: String(formData.get("body") ?? ""),
    anonymous: String(formData.get("anonymous") ?? "1"),
    nickname: String(formData.get("nickname") ?? ""),
  };
  if (![noteId, parentId, replyToId].every((id) => id === undefined || idSchema.safeParse(id).success)) return { message: "잘못된 요청이에요", values };
  const parsed = commentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf<CommentField>(parsed.error), values };

  try {
    const result = await createComment(user.id, noteId, parsed.data, { parentId, replyToId });
    if (!result.ok) {
      const message = {
        not_found: "족보를 찾을 수 없어요",
        bad_parent: "답글을 달 댓글이 지워졌어요. 새로고침해 주세요",
        too_fast: "댓글을 너무 빨리 쓰고 있어요. 잠시 후에 다시 써 주세요",
      }[result.reason];
      return { message, values };
    }
    // 닉네임을 기억해 다음 댓글의 기본값으로
    if (parsed.data.nickname && parsed.data.nickname !== user.nickname) updateTag(`profile:${user.id}`);
    const thread = (await listComments(noteId, user.id)) ?? undefined;
    return { savedAt: Date.now(), newId: result.id, thread };
  } catch {
    return { message: FAILED, values };
  }
}

export async function editCommentAction(id: string, body: string): Promise<{ thread?: CommentThread; message?: string }> {
  const user = await getOptionalUser();
  if (!user || !idSchema.safeParse(id).success) return { message: "잘못된 요청이에요" };
  const parsed = commentBodySchema.safeParse(body);
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  try {
    const noteId = await updateComment(user.id, id, parsed.data);
    if (!noteId) return { message: "고칠 수 없는 댓글이에요" };
    return { thread: (await listComments(noteId, user.id)) ?? undefined };
  } catch {
    return { message: FAILED };
  }
}

export async function deleteCommentAction(id: string): Promise<{ thread?: CommentThread; message?: string }> {
  const user = await getOptionalUser();
  if (!user || !idSchema.safeParse(id).success) return { message: "잘못된 요청이에요" };
  try {
    const noteId = await deleteComment(user.id, id);
    if (!noteId) return { message: "지울 수 없는 댓글이에요" };
    return { thread: (await listComments(noteId, user.id)) ?? undefined };
  } catch {
    return { message: FAILED };
  }
}

export async function likeCommentAction(id: string): Promise<{ thread?: CommentThread; message?: string }> {
  const user = await getOptionalUser();
  if (!user || !idSchema.safeParse(id).success) return { message: "잘못된 요청이에요" };
  try {
    const noteId = await toggleLike(user.id, id);
    if (!noteId) return { message: "지워진 댓글이에요" };
    return { thread: (await listComments(noteId, user.id)) ?? undefined };
  } catch {
    return { message: FAILED };
  }
}
