import "server-only";
import { db } from "@/lib/db";
import type { NoteInput } from "@/lib/validation/notes";

// 족보·크레딧 DB 처리. viewerId/userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.
// 크레딧이 바뀌는 처리는 모두 한 트랜잭션: 잔액(Profile.credits)과 내역(CreditLedger)이 항상 같이 움직인다.

export const NOTE_PAGE_SIZE = 20;
export const UPLOAD_REWARD = 2;
export const UNLOCK_COST = 1;

export type NoteBody = { questions: string[]; supplies: string[]; atmosphere: string; tips: string[] };
export type NoteCard = {
  id: string;
  hospital: string;
  ward: string;
  title: string;
  likeCount: number;
  liked: boolean;
  mine: boolean;
  /** 잠긴 족보는 null. 본문은 DB에서 꺼내지도 않는다 */
  body: NoteBody | null;
};

const TX = { timeout: 15_000, maxWait: 10_000 };

class InsufficientCredits extends Error {}

/** 최신순 20개씩. 잠긴 족보는 제목·병동만, 본문은 내 것·연 것만 따로 불러온다 (줄마다 DB를 부르지 않음) */
export async function listNotes(viewerId: string | null, ward?: string, cursor?: string) {
  const rows = await db.wardNote.findMany({
    where: ward ? { ward } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: NOTE_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, hospital: true, ward: true, title: true, likeCount: true, authorId: true },
  });
  const page = rows.slice(0, NOTE_PAGE_SIZE);
  const ids = page.map((r) => r.id);

  const [unlocks, likes] = viewerId
    ? await Promise.all([
        db.wardNoteUnlock.findMany({ where: { userId: viewerId, noteId: { in: ids } }, select: { noteId: true } }),
        db.wardNoteLike.findMany({ where: { userId: viewerId, noteId: { in: ids } }, select: { noteId: true } }),
      ])
    : [[], []];
  const unlocked = new Set(unlocks.map((u) => u.noteId));
  const liked = new Set(likes.map((l) => l.noteId));
  const openIds = page.filter((r) => r.authorId === viewerId || unlocked.has(r.id)).map((r) => r.id);

  const bodies = openIds.length
    ? await db.wardNote.findMany({
        where: { id: { in: openIds } },
        select: { id: true, questions: true, supplies: true, atmosphere: true, tips: true },
      })
    : [];
  const bodyById = new Map(bodies.map(({ id, ...body }) => [id, body]));

  const items: NoteCard[] = page.map((r) => ({
    id: r.id,
    hospital: r.hospital,
    ward: r.ward,
    title: r.title,
    likeCount: r.likeCount,
    liked: liked.has(r.id),
    mine: r.authorId === viewerId,
    body: bodyById.get(r.id) ?? null,
  }));
  return { items, nextCursor: rows.length > NOTE_PAGE_SIZE ? page[page.length - 1].id : null };
}

/** 병동 칩: 족보가 많은 병동 순 */
export async function listWards() {
  const groups = await db.wardNote.groupBy({ by: ["ward"], _count: { _all: true }, orderBy: { _count: { ward: "desc" } }, take: 12 });
  return groups.map((g) => g.ward);
}

export async function getCredits(userId: string) {
  const row = await db.profile.findUnique({ where: { id: userId }, select: { credits: true } });
  return row?.credits ?? 0;
}

/** 족보 올리기 + 보상 +2 (한 트랜잭션) */
export async function createNote(userId: string, input: NoteInput) {
  return db.$transaction(async (tx) => {
    const note = await tx.wardNote.create({ data: { authorId: userId, ...input }, select: { id: true } });
    await tx.creditLedger.create({ data: { userId, delta: UPLOAD_REWARD, reason: "upload", noteId: note.id } });
    await tx.profile.update({ where: { id: userId }, data: { credits: { increment: UPLOAD_REWARD } } });
    return note.id;
  }, TX);
}

/** 작성자만 고칠 수 있다. 남의 족보면 0건이 바뀌고 false */
export async function updateNote(userId: string, id: string, input: NoteInput) {
  const { count } = await db.wardNote.updateMany({ where: { id, authorId: userId }, data: input });
  return count === 1;
}

/** 작성자만 지울 수 있다. 올릴 때 받은 2크레딧은 잔액이 허락하는 만큼 회수한다 (0 미만으로는 내려가지 않음) */
export async function deleteNote(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const { count } = await tx.wardNote.deleteMany({ where: { id, authorId: userId } });
    if (count !== 1) return false;
    const [row] = await tx.$queryRaw<{ before: number; after: number }[]>`
      WITH old AS (SELECT "credits" FROM "Profile" WHERE "id" = ${userId}::uuid FOR UPDATE)
      UPDATE "Profile" SET "credits" = GREATEST("Profile"."credits" - ${UPLOAD_REWARD}, 0)
      FROM old WHERE "Profile"."id" = ${userId}::uuid
      RETURNING old."credits" AS before, "Profile"."credits" AS after`;
    const delta = row.after - row.before;
    if (delta !== 0) await tx.creditLedger.create({ data: { userId, delta, reason: "delete_note", noteId: id } });
    return true;
  }, TX);
}

export type UnlockResult = "unlocked" | "already" | "mine" | "insufficient" | "not_found";

/**
 * 남의 족보 열기 (-1). 한 트랜잭션:
 * 열람 기록 넣기(이미 있으면 아무것도 안 함) → 새로 넣었을 때만 "크레딧 ≥ 1"이면 -1 → 모자라면 전체 취소.
 * (사용자, 족보) 기본 키 덕분에 연타하거나 두 기기에서 동시에 눌러도 한 번만 차감된다.
 */
export async function unlockNote(userId: string, noteId: string): Promise<UnlockResult> {
  try {
    return await db.$transaction(async (tx) => {
      const note = await tx.wardNote.findUnique({ where: { id: noteId }, select: { authorId: true } });
      if (!note) return "not_found";
      if (note.authorId === userId) return "mine";
      const inserted = await tx.$executeRaw`
        INSERT INTO "WardNoteUnlock" ("userId", "noteId") VALUES (${userId}::uuid, ${noteId})
        ON CONFLICT ("userId", "noteId") DO NOTHING`;
      if (inserted === 0) return "already";
      const charged = await tx.$executeRaw`
        UPDATE "Profile" SET "credits" = "credits" - ${UNLOCK_COST} WHERE "id" = ${userId}::uuid AND "credits" >= ${UNLOCK_COST}`;
      if (charged === 0) throw new InsufficientCredits();
      await tx.creditLedger.create({ data: { userId, delta: -UNLOCK_COST, reason: "unlock", noteId } });
      return "unlocked";
    }, TX);
  } catch (error) {
    if (error instanceof InsufficientCredits) return "insufficient";
    throw error;
  }
}

/** 좋아요를 원하는 상태로 맞춘다 (누름/취소). 같은 요청이 여러 번 와도 결과가 같다 */
export async function setLike(userId: string, noteId: string, like: boolean) {
  return db.$transaction(async (tx) => {
    const exists = await tx.wardNote.findUnique({ where: { id: noteId }, select: { id: true } });
    if (!exists) return false;
    if (like) {
      const inserted = await tx.$executeRaw`
        INSERT INTO "WardNoteLike" ("userId", "noteId") VALUES (${userId}::uuid, ${noteId})
        ON CONFLICT ("userId", "noteId") DO NOTHING`;
      if (inserted === 1) await tx.wardNote.update({ where: { id: noteId }, data: { likeCount: { increment: 1 } } });
    } else {
      const { count } = await tx.wardNoteLike.deleteMany({ where: { userId, noteId } });
      if (count === 1) await tx.wardNote.update({ where: { id: noteId }, data: { likeCount: { decrement: 1 } } });
    }
    return true;
  }, TX);
}
