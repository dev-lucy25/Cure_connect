"use client";

import Link from "next/link";
import { loginHref } from "@/lib/safe-next";
import { useActionState, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { createNoteAction, loadMoreNotes, type NoteFormState } from "@/server/notes-actions";
import type { NoteCard as NoteCardData, NoteFilter } from "@/server/notes-repo";
import { NOTE_CATEGORIES, UPLOAD_REWARD } from "@/lib/credits";
import { FADE_UP, SPRING_SNAPPY, SPRING_SOFT, STAGGER_STEP } from "@/lib/motion";
import AnimatedNumber from "@/components/motion/animated-number";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import FormStatus from "@/components/ui/form-status";
import Modal from "@/components/ui/modal";
import { NotesMoreSkeleton } from "@/components/ui/skeleton";
import CreditShop from "@/components/credits/credit-shop";
import NoteCard from "@/components/notes/note-card";
import NoteForm from "@/components/notes/note-form";

const MotionLink = motion.create(Link);

/** 지금 필터에서 일부만 바꾼 /notes 주소 */
function hrefWith(filter: NoteFilter, change: Partial<NoteFilter>) {
  const next = { ...filter, ...change };
  const q = new URLSearchParams();
  if (next.category) q.set("category", next.category);
  if (next.ward) q.set("ward", next.ward);
  if (next.sort === "popular") q.set("sort", "popular");
  if (next.q) q.set("q", next.q);
  const s = q.toString();
  return s ? `/notes?${s}` : "/notes";
}

export default function NotesMarket({
  items,
  nextCursor,
  filter,
  credits,
  viewer,
  canWrite,
  rewardAvailable,
  startWriting,
}: {
  items: NoteCardData[];
  nextCursor: string | null;
  filter: NoteFilter;
  /** 학생만 숫자, 손님·교수는 null */
  credits: number | null;
  /** 보는 사람: 손님은 로그인 안내, 교수는 읽기 전용 안내 */
  viewer: "guest" | "student" | "professor";
  /** 학생만 족보를 올린다 */
  canWrite: boolean;
  rewardAvailable: boolean;
  /** 주소에 ?write=1 (충전소의 "후기 작성하기"에서 옴) */
  startWriting: boolean;
}) {
  const router = useRouter();
  const loggedIn = viewer === "student" && credits !== null;
  const tap = useTapEffect();
  const [shopOpen, setShopOpen] = useState(false);
  const [state, action, pending] = useActionState<NoteFormState, FormData>(createNoteAction, {});
  const [writeAt, setWriteAt] = useState<number | null>(startWriting && canWrite ? 0 : null);
  const writing = writeAt !== null && !(state.savedAt && state.savedAt > writeAt);
  const openShop = useCallback(() => setShopOpen(true), []);

  function closeWriting() {
    setWriteAt(null);
    if (startWriting) router.replace(hrefWith(filter, {}), { scroll: false });
  }

  return (
    <div className="space-y-4">
      {/* 배너: 보유 크레딧 + 족보 팔기 + 충전소 */}
      <motion.section
        variants={FADE_UP}
        initial="hidden"
        animate="show"
        transition={SPRING_SOFT}
        className="flex flex-col gap-4 rounded-card bg-ink p-5 text-canvas md:flex-row md:items-center md:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-warn-bg px-2 py-0.5 text-caption font-bold text-warn-ink">C2C 지식 거래 마켓</span>
            {loggedIn && (
              <span className="text-body-sm text-canvas/80">
                내 보유 크레딧 <AnimatedNumber value={credits} format={{ maximumFractionDigits: 0 }} className="font-bold text-canvas" /> C
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-title font-bold">선배들의 병동별 시크릿 족보</h2>
          <p className="mt-1 text-body-sm text-canvas/75">실습 나가기 전날, 그 병동을 먼저 다녀온 선배의 수간호사님 질문과 핵심 루틴을 크레딧으로 열어 보세요.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canWrite ? (
            <Button type="button" onClick={() => setWriteAt(Date.now())} className="bg-warn-bg px-4 text-body-sm text-warn-ink">
              ✍️ 내 실습 족보 팔고 +{UPLOAD_REWARD} C
            </Button>
          ) : (
            viewer === "guest" && (
              <Link href={loginHref("/notes")} className={`${buttonClass("secondary")} px-4 text-body-sm`}>
                로그인하고 300 C 받기
              </Link>
            )
          )}
          {loggedIn && (
            <Button type="button" variant="ghost" onClick={openShop} className="bg-canvas/15 px-4 text-body-sm text-canvas hover:bg-canvas/25">
              💎 크레딧 충전소
            </Button>
          )}
        </div>
      </motion.section>
      <FormStatus savedAt={state.savedAt} savedText={state.notice} />

      {/* 검색 + 분류 필터 (선택 알약이 미끄러짐) + 정렬 + 병동 */}
      <nav aria-label="족보 필터" className="space-y-2">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            router.push(hrefWith(filter, { q: q || undefined }), { scroll: false });
          }}
          className="flex gap-2"
        >
          <label htmlFor="note-search" className="sr-only">
            족보 검색
          </label>
          <input
            id="note-search"
            name="q"
            type="search"
            defaultValue={filter.q ?? ""}
            maxLength={40}
            placeholder="🔍 병원·병동·제목으로 찾기"
            className="min-h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-4 text-body-sm text-ink placeholder:text-ink-soft focus:border-brand-deep focus:outline-none"
          />
          <Button type="submit" variant="secondary" className="min-h-11 shrink-0 px-4 text-body-sm">
            찾기
          </Button>
        </form>
        {filter.q && (
          <Link
            href={hrefWith(filter, { q: undefined })}
            scroll={false}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-brand-soft px-3 text-body-sm font-bold text-brand-deep"
            aria-label={`'${filter.q}' 검색 지우기`}
          >
            “{filter.q}” 검색 결과 ✕
          </Link>
        )}
        <ul className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {[{ key: undefined, label: "전체 병동" }, ...NOTE_CATEGORIES].map((c) => {
            const active = filter.category === c.key;
            return (
              <li key={c.label} className="shrink-0">
                <MotionLink
                  href={hrefWith(filter, { category: c.key })}
                  aria-current={active ? "page" : undefined}
                  whileTap={tap}
                  scroll={false}
                  className={`relative isolate inline-flex min-h-11 items-center rounded-full px-3.5 text-body-sm font-bold transition-colors ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  {active && <motion.span layoutId="note-category-pill" transition={SPRING_SNAPPY} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-brand" />}
                  {c.label}
                </MotionLink>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-body-sm">
          {filter.ward && (
            <Link
              href={hrefWith(filter, { ward: undefined })}
              scroll={false}
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-brand-soft px-3 font-bold text-brand-deep"
              aria-label={`${filter.ward} 필터 지우기`}
            >
              {filter.ward} ✕
            </Link>
          )}
          {(["new", "popular"] as const).map((s) => (
            <Link
              key={s}
              href={hrefWith(filter, { sort: s })}
              scroll={false}
              aria-current={(filter.sort ?? "new") === s ? "page" : undefined}
              className={`inline-flex min-h-11 items-center px-2 font-bold ${(filter.sort ?? "new") === s ? "text-ink underline underline-offset-4" : "text-ink-soft"}`}
            >
              {s === "new" ? "최신순" : "인기순"}
            </Link>
          ))}
          <span className="ml-auto text-caption text-ink-soft">🔓 잠금 해제한 족보는 졸업 때까지 무제한 열람</span>
        </div>
      </nav>

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-card border border-dashed border-line px-5 py-10 text-center">
          <NurseTurtle stage={4} mood="empty" size={88} decorative />
          <p className="mt-2 text-title font-bold">{filter.ward || filter.category ? "이 조건의 족보가 아직 없어요" : "아직 올라온 족보가 없어요"}</p>
          <p className="mt-1 text-body-sm text-ink-soft">지난 실습 병동의 꿀팁을 첫 번째로 남겨 보세요</p>
        </div>
      ) : (
        <NotePages
          key={`${hrefWith(filter, {})}|${items.map((i) => i.id).join()}`}
          items={items}
          nextCursor={nextCursor}
          filter={filter}
          viewer={viewer}
          onInsufficient={openShop}
        />
      )}

      <Modal open={writing} onClose={closeWriting} title="✍️ 선배 병동 꿀팁 & 족보 등록">
        <NoteForm action={action} state={state} pending={pending} rewardAvailable={rewardAvailable} onCancel={closeWriting} />
      </Modal>
      <Modal open={shopOpen} onClose={() => setShopOpen(false)} title="💎 너스패스 크레딧 충전소">
        <CreditShop
          onWrite={() => {
            setShopOpen(false);
            if (canWrite) setWriteAt(Date.now());
          }}
        />
      </Modal>
    </div>
  );
}

// 첫 페이지가 바뀌면(key) 더 불러온 부분을 버리고 다시 시작한다. 카드는 차례로 떠오른다
function NotePages({
  items,
  nextCursor,
  filter,
  viewer,
  onInsufficient,
}: {
  items: NoteCardData[];
  nextCursor: string | null;
  filter: NoteFilter;
  viewer: "guest" | "student" | "professor";
  onInsufficient: () => void;
}) {
  const [more, setMore] = useState<NoteCardData[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();

  function loadMore() {
    if (!cursor) return;
    setFailed(false);
    startLoading(async () => {
      try {
        const page = await loadMoreNotes(filter, cursor);
        setMore((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {[...items, ...more].map((note, i) => (
          <motion.div
            key={note.id}
            variants={FADE_UP}
            initial="hidden"
            animate="show"
            transition={{ ...SPRING_SOFT, delay: Math.min(i < items.length ? i : i - items.length, 8) * STAGGER_STEP }}
          >
            <NoteCard note={note} viewer={viewer} onInsufficient={onInsufficient} />
          </motion.div>
        ))}
      </div>
      {loading && <NotesMoreSkeleton />}
      {failed && <FormStatus message="족보를 더 불러오지 못했어요. 다시 눌러 주세요" />}
      {cursor && !loading && (
        <Button type="button" variant="ghost" block onClick={loadMore}>
          더 보기
        </Button>
      )}
    </>
  );
}
