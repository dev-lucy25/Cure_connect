"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FADE_UP, SPRING_SOFT, STAGGER_STEP } from "@/lib/motion";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import { CasesMoreSkeleton } from "@/components/ui/skeleton";
import { createCaseAction, loadMoreCases } from "@/server/case-actions";
import type { FormState } from "@/lib/validation/form";
import type { CaseField } from "@/lib/validation/case";
import type { CaseSummary } from "@/server/case-repo";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import { IconPlus, IconUpload } from "@/components/ui/icons";
import PageHeader from "@/components/ui/page-header";
import CaseForm from "@/components/cases/case-form";

export default function CaseList({
  items,
  nextCursor,
  notice,
}: {
  items: CaseSummary[];
  nextCursor: string | null;
  notice?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<
    FormState<CaseField>,
    FormData
  >(createCaseAction, {});
  const [writing, setWriting] = useState(false);

  return (
    <div className="space-y-3">
      <PageHeader
        title="케이스"
        description="SOAPIE AI 도우미가 현장 메모를 간호기록 초안으로 정리해요"
        action={
          <Link
            href="/submissions"
            className="inline-flex min-h-11 shrink-0 items-center text-body-sm font-bold text-brand-deep hover:underline"
          >
            <IconUpload size={16} /> 내 제출
          </Link>
        }
      />
      {notice}

      {/* 히어로: 새 케이스 쓰기. 저장에 성공하면 서버가 새 케이스 화면으로 보내므로 폼은 실패할 때만 다시 그려진다 */}
      <div className="pt-2">
        {/* 카드 ↔ 쓰기 폼이 자연스럽게 바뀐다 */}
        <AnimatePresence mode="wait" initial={false}>
          {writing ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={SPRING_SOFT}
            >
              <CaseForm
                action={action}
                state={state}
                pending={pending}
                onCancel={() => setWriting(false)}
                submitLabel="저장하고 열기"
              />
            </motion.div>
          ) : (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={SPRING_SOFT}
            >
              <Card className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-card bg-brand-soft">
                  <NurseTurtle stage={3} size={56} decorative />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-title font-bold">새 케이스</p>
                  <p className="text-body-sm text-ink-soft">
                    메모는 본인만 볼 수 있어요
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setWriting(true)}
                  className="shrink-0 px-4 text-body-sm"
                >
                  <IconPlus size={18} /> 케이스 쓰기
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section aria-labelledby="cases-title" className="space-y-3 pt-3">
        <h2 id="cases-title" className="text-title font-bold">
          내 케이스
        </h2>
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-card border border-dashed border-line px-5 py-8 text-center">
            <NurseTurtle stage={3} mood="empty" size={88} decorative />
            <p className="mt-2 text-title font-bold">아직 케이스가 없어요</p>
            <p className="mt-1 text-body-sm text-ink-soft">
              실습 중 적은 메모로 첫 케이스를 만들어 보세요
            </p>
          </div>
        ) : (
          <Pages
            key={items.map((i) => i.id + i.updatedAt).join()}
            items={items}
            nextCursor={nextCursor}
          />
        )}
      </section>
    </div>
  );
}

// 첫 페이지가 바뀌면(key) 더 불러온 부분을 버리고 다시 시작한다
function Pages({
  items,
  nextCursor,
}: {
  items: CaseSummary[];
  nextCursor: string | null;
}) {
  const [more, setMore] = useState<CaseSummary[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();
  const tap = useTapEffect(0.98);

  function loadMore() {
    if (!cursor) return;
    setFailed(false);
    startLoading(async () => {
      try {
        const page = await loadMoreCases(cursor);
        setMore((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <>
      <ul className="space-y-3">
        {[...items, ...more].map((c, i) => (
          // 처음 목록은 차례로, 더 불러온 카드는 그 묶음 안에서 차례로 떠오른다
          <motion.li
            key={c.id}
            variants={FADE_UP}
            initial="hidden"
            animate="show"
            transition={{
              ...SPRING_SOFT,
              delay:
                Math.min(i < items.length ? i : i - items.length, 8) *
                STAGGER_STEP,
            }}
          >
            <MotionLink
              href={`/cases/${c.id}`}
              whileTap={tap}
              className="block rounded-card border border-line bg-surface p-5 shadow-soft transition-colors hover:border-brand"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-title font-bold">{c.title}</p>
                  <p className="truncate text-body-sm text-ink-soft">
                    {c.ward}
                  </p>
                </div>
                <AiBadge hasAi={c.hasAi} stale={c.stale} />
              </div>
              <p className="mt-2 line-clamp-2 text-body-sm text-ink-soft">
                {c.preview}
              </p>
            </MotionLink>
          </motion.li>
        ))}
      </ul>
      {/* 더 불러오는 동안 카드 모양 스켈레톤 */}
      {loading && <CasesMoreSkeleton />}
      {failed && (
        <FormStatus message="케이스를 더 불러오지 못했어요. 다시 눌러 주세요" />
      )}
      {cursor && !loading && (
        <Button type="button" variant="ghost" block onClick={loadMore}>
          더 보기
        </Button>
      )}
    </>
  );
}

const MotionLink = motion.create(Link);

export function AiBadge({ hasAi, stale }: { hasAi: boolean; stale: boolean }) {
  if (!hasAi)
    return (
      <Chip tone="neutral" className="shrink-0">
        메모만
      </Chip>
    );
  if (stale)
    return (
      <Chip tone="pink" className="shrink-0">
        다시 정리
      </Chip>
    );
  return <Chip className="shrink-0">AI 정리됨</Chip>;
}
