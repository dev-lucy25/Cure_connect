import "server-only";
import { db } from "@/lib/db";
import { todayKst } from "@/lib/dates";
import { UPLOAD_REWARD, UPLOAD_REWARD_PER_DAY, UPLOAD_REWARD_PER_MONTH, rewardEligible, saleShare } from "@/lib/credits";
import type { NoteInput } from "@/lib/validation/notes";
import type { CreditReason, NoteCategory } from "@/generated/prisma/client";

// 족보·크레딧 DB 처리. viewerId/userId는 반드시 서버에서 확인한 로그인 사용자 id여야 한다.
// 크레딧이 바뀌는 처리는 모두 한 트랜잭션: 잔액(Profile.credits)과 내역(CreditLedger)이 항상 같이 움직인다.
// 시크릿(자주 받은 질문·팁)은 작성자·열람한 사람·무료 족보일 때만 DB에서 꺼낸다 → 잠긴 내용은 화면 데이터에 아예 없다.

export const NOTE_PAGE_SIZE = 20;

export type NotePublic = { supplies: string[]; atmosphere: string };
export type NoteSecret = { questions: string[]; tips: string[] };
export type NoteCard = {
  id: string;
  hospital: string;
  ward: string;
  title: string;
  category: NoteCategory;
  price: number;
  salesCount: number;
  /** 평균 평점(소수 1자리), 평가가 없으면 null */
  rating: number | null;
  ratingCount: number;
  /** 내가 매긴 평점 (없으면 null) */
  myRating: number | null;
  authorLabel: string;
  mine: boolean;
  /** 시크릿을 볼 수 있는가 (작성자·열람함·무료) */
  open: boolean;
  public: NotePublic;
  /** 잠긴 족보는 null. 본문은 DB에서 꺼내지도 않는다 */
  secret: NoteSecret | null;
};

export type NoteSort = "new" | "popular";
export type NoteFilter = { category?: NoteCategory; ward?: string; sort?: NoteSort };

const TX = { timeout: 15_000, maxWait: 10_000 };

class InsufficientCredits extends Error {}

/** "3학년 김선배" — 실명은 드러내지 않는다 */
function authorLabel(author: { name: string; grade: number | null }) {
  return `${author.grade ? `${author.grade}학년 ` : ""}${author.name.slice(0, 1)}선배`;
}

/** 공개된 족보 20개씩 (최신순 또는 인기순). 시크릿은 열 수 있는 것만 따로 불러온다 */
export async function listNotes(viewerId: string | null, filter: NoteFilter = {}, cursor?: string) {
  const rows = await db.wardNote.findMany({
    where: { status: "published", ...(filter.category ? { category: filter.category } : {}), ...(filter.ward ? { ward: filter.ward } : {}) },
    orderBy: filter.sort === "popular" ? [{ salesCount: "desc" }, { createdAt: "desc" }, { id: "desc" }] : [{ createdAt: "desc" }, { id: "desc" }],
    take: NOTE_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      hospital: true,
      ward: true,
      title: true,
      category: true,
      price: true,
      salesCount: true,
      ratingSum: true,
      ratingCount: true,
      supplies: true,
      atmosphere: true,
      authorId: true,
      author: { select: { name: true, grade: true } },
    },
  });
  const page = rows.slice(0, NOTE_PAGE_SIZE);
  const ids = page.map((r) => r.id);

  const [unlocks, ratings] = viewerId
    ? await Promise.all([
        db.wardNoteUnlock.findMany({ where: { userId: viewerId, noteId: { in: ids } }, select: { noteId: true } }),
        db.wardNoteRating.findMany({ where: { userId: viewerId, noteId: { in: ids } }, select: { noteId: true, score: true } }),
      ])
    : [[], []];
  const unlocked = new Set(unlocks.map((u) => u.noteId));
  const myRating = new Map(ratings.map((r) => [r.noteId, r.score]));
  const canOpen = (r: (typeof page)[number]) => r.price === 0 || r.authorId === viewerId || unlocked.has(r.id);
  const openIds = page.filter(canOpen).map((r) => r.id);

  const secrets = openIds.length
    ? await db.wardNote.findMany({ where: { id: { in: openIds } }, select: { id: true, questions: true, tips: true } })
    : [];
  const secretById = new Map(secrets.map(({ id, ...secret }) => [id, secret]));

  const items: NoteCard[] = page.map((r) => ({
    id: r.id,
    hospital: r.hospital,
    ward: r.ward,
    title: r.title,
    category: r.category,
    price: r.price,
    salesCount: r.salesCount,
    rating: r.ratingCount > 0 ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10 : null,
    ratingCount: r.ratingCount,
    myRating: myRating.get(r.id) ?? null,
    authorLabel: authorLabel(r.author),
    mine: r.authorId === viewerId,
    open: canOpen(r),
    public: { supplies: r.supplies, atmosphere: r.atmosphere },
    secret: secretById.get(r.id) ?? null,
  }));
  return { items, nextCursor: rows.length > NOTE_PAGE_SIZE ? page[page.length - 1].id : null };
}

/** 병동 칩: 족보가 많은 병동 순 */
export async function listWards() {
  const groups = await db.wardNote.groupBy({
    by: ["ward"],
    where: { status: "published" },
    _count: { _all: true },
    orderBy: { _count: { ward: "desc" } },
    take: 12,
  });
  return groups.map((g) => g.ward);
}

export async function getCredits(userId: string) {
  const row = await db.profile.findUnique({ where: { id: userId }, select: { credits: true } });
  return row?.credits ?? 0;
}

/** 내 작성 족보의 고칠 값(시크릿 포함). 작성자가 아니면 null */
export async function getMyNote(userId: string, id: string) {
  return db.wardNote.findFirst({
    where: { id, authorId: userId },
    select: { id: true, category: true, price: true, hospital: true, ward: true, title: true, questions: true, supplies: true, atmosphere: true, tips: true },
  });
}

export type CreateResult = { id: string; rewarded: number; noReward?: "short" | "daily" | "monthly" };

/**
 * 족보 올리기 + 조건이 맞으면 보상 +500 (한 트랜잭션).
 * 하루 1회·한 달 4회 한도는 사용자별 잠금 안에서 세므로 동시에 여러 번 올려도 넘지 않는다.
 */
export async function createNote(userId: string, input: NoteInput): Promise<CreateResult> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`note-reward:${userId}`}))`;
    const note = await tx.wardNote.create({ data: { authorId: userId, ...input }, select: { id: true } });

    if (!rewardEligible(input)) return { id: note.id, rewarded: 0, noReward: "short" as const };
    const today = todayKst();
    const dayStart = new Date(`${today}T00:00:00+09:00`);
    const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+09:00`);
    const [day, month] = await Promise.all([
      tx.creditLedger.count({ where: { userId, reason: "upload", createdAt: { gte: dayStart } } }),
      tx.creditLedger.count({ where: { userId, reason: "upload", createdAt: { gte: monthStart } } }),
    ]);
    if (day >= UPLOAD_REWARD_PER_DAY) return { id: note.id, rewarded: 0, noReward: "daily" as const };
    if (month >= UPLOAD_REWARD_PER_MONTH) return { id: note.id, rewarded: 0, noReward: "monthly" as const };

    await tx.creditLedger.create({ data: { userId, delta: UPLOAD_REWARD, reason: "upload", noteId: note.id } });
    await tx.profile.update({ where: { id: userId }, data: { credits: { increment: UPLOAD_REWARD } } });
    return { id: note.id, rewarded: UPLOAD_REWARD };
  }, TX);
}

/** 작성자만 고칠 수 있다. 남의 족보면 0건이 바뀌고 false */
export async function updateNote(userId: string, id: string, input: NoteInput) {
  const { count } = await db.wardNote.updateMany({ where: { id, authorId: userId }, data: input });
  return count === 1;
}

export type DeleteResult = "deleted" | "not_found" | "sold";

/**
 * 작성자만 지울 수 있다. 이미 누가 돈을 내고 열었으면 지울 수 없다(산 사람의 열람권 보호 → 고치기만).
 * 올릴 때 받은 보상은 잔액이 허락하는 만큼 회수한다 (0 미만으로는 내려가지 않음)
 */
export async function deleteNote(userId: string, id: string): Promise<DeleteResult> {
  return db.$transaction(async (tx) => {
    const note = await tx.wardNote.findFirst({ where: { id, authorId: userId }, select: { salesCount: true } });
    if (!note) return "not_found";
    if (note.salesCount > 0) return "sold";
    const reward = await tx.creditLedger.findFirst({ where: { userId, reason: "upload", noteId: id }, select: { delta: true } });
    await tx.wardNote.delete({ where: { id } });
    if (reward) {
      const [row] = await tx.$queryRaw<{ before: number; after: number }[]>`
        WITH old AS (SELECT "credits" FROM "Profile" WHERE "id" = ${userId}::uuid FOR UPDATE)
        UPDATE "Profile" SET "credits" = GREATEST("Profile"."credits" - ${reward.delta}, 0)
        FROM old WHERE "Profile"."id" = ${userId}::uuid
        RETURNING old."credits" AS before, "Profile"."credits" AS after`;
      const delta = row.after - row.before;
      if (delta !== 0) await tx.creditLedger.create({ data: { userId, delta, reason: "delete_note", noteId: id } });
    }
    return "deleted";
  }, TX);
}

export type UnlockResult = "unlocked" | "already" | "mine" | "free" | "insufficient" | "not_found";

/**
 * 남의 족보 열기 (가격만큼 차감, 작성자에게 80% 적립). 한 트랜잭션:
 * 열람 기록 넣기(이미 있으면 아무것도 안 함) → 새로 넣었을 때만 "잔액 ≥ 가격"이면 차감 → 모자라면 전체 취소
 * → 작성자 적립 → 내역 2줄(산 사람 unlock, 판 사람 sale) → 열람 수 +1.
 * (사용자, 족보) 기본 키 덕분에 연타하거나 두 기기에서 동시에 눌러도 한 번만 차감된다.
 */
export async function unlockNote(userId: string, noteId: string): Promise<UnlockResult> {
  try {
    return await db.$transaction(async (tx) => {
      const note = await tx.wardNote.findFirst({ where: { id: noteId, status: "published" }, select: { authorId: true, price: true } });
      if (!note) return "not_found";
      if (note.authorId === userId) return "mine";
      if (note.price === 0) return "free";
      const inserted = await tx.$executeRaw`
        INSERT INTO "WardNoteUnlock" ("userId", "noteId") VALUES (${userId}::uuid, ${noteId})
        ON CONFLICT ("userId", "noteId") DO NOTHING`;
      if (inserted === 0) return "already";
      const charged = await tx.$executeRaw`
        UPDATE "Profile" SET "credits" = "credits" - ${note.price} WHERE "id" = ${userId}::uuid AND "credits" >= ${note.price}`;
      if (charged === 0) throw new InsufficientCredits();
      const share = saleShare(note.price);
      await tx.profile.update({ where: { id: note.authorId }, data: { credits: { increment: share } } });
      await tx.creditLedger.createMany({
        data: [
          { userId, delta: -note.price, reason: "unlock", noteId, counterpartyId: note.authorId },
          { userId: note.authorId, delta: share, reason: "sale", noteId, counterpartyId: userId },
        ],
      });
      await tx.wardNote.update({ where: { id: noteId }, data: { salesCount: { increment: 1 } } });
      return "unlocked";
    }, TX);
  } catch (error) {
    if (error instanceof InsufficientCredits) return "insufficient";
    throw error;
  }
}

export type RateResult = "rated" | "not_found" | "mine" | "locked";

/** 평점 매기기(1~5). 열람한 사람(무료 족보는 누구나)만, 다시 매기면 바뀐다. 합계·개수를 한 트랜잭션에서 맞춘다 */
export async function rateNote(userId: string, noteId: string, score: number): Promise<RateResult> {
  return db.$transaction(async (tx) => {
    const note = await tx.wardNote.findFirst({ where: { id: noteId, status: "published" }, select: { authorId: true, price: true } });
    if (!note) return "not_found";
    if (note.authorId === userId) return "mine";
    if (note.price > 0) {
      const unlocked = await tx.wardNoteUnlock.findUnique({ where: { userId_noteId: { userId, noteId } }, select: { userId: true } });
      if (!unlocked) return "locked";
    }
    // 같은 사용자의 평점 행을 잠가 동시에 눌러도 합계가 어긋나지 않게
    const [old] = await tx.$queryRaw<{ score: number }[]>`
      SELECT "score" FROM "WardNoteRating" WHERE "userId" = ${userId}::uuid AND "noteId" = ${noteId} FOR UPDATE`;
    if (old) {
      if (old.score !== score) {
        await tx.wardNoteRating.update({ where: { userId_noteId: { userId, noteId } }, data: { score } });
        await tx.wardNote.update({ where: { id: noteId }, data: { ratingSum: { increment: score - old.score } } });
      }
    } else {
      const inserted = await tx.$executeRaw`
        INSERT INTO "WardNoteRating" ("userId", "noteId", "score", "updatedAt") VALUES (${userId}::uuid, ${noteId}, ${score}, NOW())
        ON CONFLICT ("userId", "noteId") DO NOTHING`;
      if (inserted === 1) {
        await tx.wardNote.update({ where: { id: noteId }, data: { ratingSum: { increment: score }, ratingCount: { increment: 1 } } });
      }
    }
    return "rated";
  }, TX);
}

export type LedgerEntry = { id: string; delta: number; reason: CreditReason; noteTitle: string | null; createdAt: string };
export const LEDGER_PAGE_SIZE = 30;

/** 크레딧 내역 최신순. 족보가 지워졌으면 제목 없이 */
export async function listLedger(userId: string, cursor?: string) {
  const rows = await db.creditLedger.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LEDGER_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, delta: true, reason: true, noteId: true, createdAt: true },
  });
  const page = rows.slice(0, LEDGER_PAGE_SIZE);
  const noteIds = [...new Set(page.map((r) => r.noteId).filter((v): v is string => v !== null))];
  const notes = noteIds.length ? await db.wardNote.findMany({ where: { id: { in: noteIds } }, select: { id: true, title: true } }) : [];
  const titleById = new Map(notes.map((n) => [n.id, n.title]));
  const items: LedgerEntry[] = page.map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    noteTitle: r.noteId ? (titleById.get(r.noteId) ?? null) : null,
    createdAt: r.createdAt.toISOString(),
  }));
  return { items, nextCursor: rows.length > LEDGER_PAGE_SIZE ? page[page.length - 1].id : null };
}

/** 오늘 남은 등록 보상 (화면 안내용) */
export async function uploadRewardLeft(userId: string) {
  const today = todayKst();
  const [day, month] = await Promise.all([
    db.creditLedger.count({ where: { userId, reason: "upload", createdAt: { gte: new Date(`${today}T00:00:00+09:00`) } } }),
    db.creditLedger.count({ where: { userId, reason: "upload", createdAt: { gte: new Date(`${today.slice(0, 7)}-01T00:00:00+09:00`) } } }),
  ]);
  return day < UPLOAD_REWARD_PER_DAY && month < UPLOAD_REWARD_PER_MONTH;
}
