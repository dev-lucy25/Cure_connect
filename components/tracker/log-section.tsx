"use client";

import { useActionState, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SOFT } from "@/lib/motion";
import Collapse from "@/components/motion/collapse";
import { LogsMoreSkeleton } from "@/components/ui/skeleton";
import { loadMoreLogs, removeLog, saveLog } from "@/server/practice-actions";
import type { FormState, LogField } from "@/lib/validation/practice";
import type { LogItem } from "@/server/practice-repo";
import { WEEKDAY, toDbDate } from "@/lib/dates";
import { shiftLabel, subjectLabel } from "@/lib/subjects";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import { IconPlus } from "@/components/ui/icons";
import LogForm from "@/components/tracker/log-form";
import RowActions from "@/components/tracker/row-actions";

export default function LogSection({
  items,
  nextCursor,
  version,
  today,
}: {
  items: LogItem[];
  nextCursor: string | null;
  /** 일지가 추가·수정·삭제되면 바뀌는 값 */
  version: string;
  today: string;
}) {
  const [state, action, pending] = useActionState<FormState<LogField>, FormData>(saveLog, {});
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const writing = openedAt !== null && !(state.savedAt && state.savedAt > openedAt);

  return (
    <section aria-labelledby="log-title" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="log-title" className="text-title font-bold">
          실습 일지
        </h2>
        <FormStatus savedAt={state.savedAt} savedText={state.notice} />
        {!writing && (
          <Button type="button" variant="secondary" onClick={() => setOpenedAt(Date.now())} className="px-4 text-body-sm">
            <IconPlus size={18} /> 일지 쓰기
          </Button>
        )}
      </div>
      <Collapse open={writing}>
        <LogForm action={action} state={state} pending={pending} today={today} onCancel={() => setOpenedAt(null)} />
      </Collapse>
      {items.length === 0 ? (
        !writing && (
          <div className="flex flex-col items-center rounded-card border border-dashed border-line px-5 py-8 text-center">
            <NurseTurtle stage={2} mood="empty" size={88} decorative />
            <p className="mt-2 text-title font-bold">아직 일지가 없어요</p>
            <p className="mt-1 text-body-sm text-ink-soft">실습한 날짜와 시간을 기록해 보세요</p>
          </div>
        )
      ) : (
        <LogTimeline items={items} nextCursor={nextCursor} version={version} today={today} />
      )}
    </section>
  );
}

function dateLabel(date: string) {
  const d = toDbDate(date);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAY[d.getUTCDay()]})`;
}

// 날짜별 타임라인: 왼쪽 세로선 + 날짜 점, 그 날짜의 일지 카드들
function LogTimeline({
  items,
  nextCursor,
  version,
  today,
}: {
  items: LogItem[];
  nextCursor: string | null;
  version: string;
  today: string;
}) {
  const [pages, setPages] = useState({ version, more: [] as LogItem[], cursor: nextCursor });
  const [failed, setFailed] = useState(false);
  const [loading, startLoading] = useTransition();

  // 일지가 바뀌면 더 불러온 부분은 오래된 내용일 수 있으니 버리고 첫 페이지부터 다시 시작한다.
  // (목록 전체를 다시 만들지 않아 각 카드의 저장 표시는 남는다)
  if (pages.version !== version) {
    setPages({ version, more: [], cursor: nextCursor });
  }
  const { more, cursor } = pages;

  function loadMore() {
    if (!cursor) return;
    setFailed(false);
    startLoading(async () => {
      try {
        const page = await loadMoreLogs(cursor);
        setPages((prev) => ({ ...prev, more: [...prev.more, ...page.items], cursor: page.nextCursor }));
      } catch {
        setFailed(true);
      }
    });
  }

  // 이미 최신 날짜순이므로 연속된 같은 날짜끼리 묶는다
  const groups: { date: string; logs: LogItem[] }[] = [];
  for (const log of [...items, ...more]) {
    const last = groups[groups.length - 1];
    if (last?.date === log.date) last.logs.push(log);
    else groups.push({ date: log.date, logs: [log] });
  }

  return (
    <>
      <ol className="relative space-y-4 border-l-2 border-line pl-5">
        <AnimatePresence initial={false}>
          {groups.map((g) => (
            <motion.li
              key={g.date}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING_SOFT}
              className="relative"
            >
              <span aria-hidden className="absolute top-1 -left-[27px] size-3 rounded-full bg-brand ring-4 ring-canvas" />
              <p className="text-body-sm font-bold text-ink-soft">{dateLabel(g.date)}</p>
              <ul className="mt-2 space-y-3">
                <AnimatePresence initial={false}>
                  {g.logs.map((log) => (
                    <LogCard key={log.id} log={log} today={today} />
                  ))}
                </AnimatePresence>
              </ul>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {failed && <FormStatus message="일지를 더 불러오지 못했어요. 다시 눌러 주세요" />}
      {/* 더 불러오는 동안 일지 카드 모양 스켈레톤 */}
      {loading && <LogsMoreSkeleton />}
      {cursor && !loading && (
        <Button type="button" variant="ghost" block onClick={loadMore}>
          더 보기
        </Button>
      )}
    </>
  );
}

function LogCard({ log, today }: { log: LogItem; today: string }) {
  const [state, action, pending] = useActionState<FormState<LogField>, FormData>(saveLog, {});
  const [del, delAction, deleting] = useActionState<FormState<never>, FormData>(removeLog, {});
  const [editAt, setEditAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const editing = editAt !== null && !(state.savedAt && state.savedAt > editAt);
  const long = log.activities.length > 90 || log.activities.split("\n").length > 3;

  // 새로 생기면 펼쳐지며 들어오고, 지우면 접히며 빠진다
  const presence = {
    layout: "position" as const,
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98, height: 0, marginTop: 0 },
    transition: SPRING_SOFT,
  };

  if (editing) {
    return (
      <motion.li {...presence}>
        <LogForm action={action} state={state} pending={pending} today={today} initial={log} onCancel={() => setEditAt(null)} />
      </motion.li>
    );
  }

  return (
    <motion.li {...presence} className="rounded-card border border-line bg-surface p-5 pb-2 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-title font-bold">
            {log.ward}
            {log.shift && <span className="ml-1.5 text-body-sm font-medium text-ink-soft">{shiftLabel(log.shift)}</span>}
          </p>
          <p className="truncate text-body-sm text-ink-soft">{log.hospital}</p>
        </div>
        <Chip>+{log.hours}시간</Chip>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip tone="neutral" className="text-caption">
          {subjectLabel(log.subject)}
        </Chip>
        <StatusChip status={log.status} />
      </div>
      {/* 펼치기·접기: 세 줄 높이 ↔ 전체 높이를 부드럽게 */}
      <motion.div
        initial={false}
        animate={{ height: long && !expanded ? "4.8em" : "auto" }}
        transition={SPRING_SOFT}
        className="mt-3 overflow-hidden text-body"
      >
        <p className={`whitespace-pre-line break-words ${long && !expanded ? "line-clamp-3" : ""}`}>{log.activities}</p>
      </motion.div>
      <div className="mt-1 flex flex-wrap items-center justify-end gap-1">
        {long && (
          <button type="button" onClick={() => setExpanded((e) => !e)} className="mr-auto min-h-11 text-body-sm font-bold text-brand-deep">
            {expanded ? "접기" : "펼치기"}
          </button>
        )}
        <FormStatus message={del.message} />
        <FormStatus savedAt={state.savedAt} />
        {log.status === "approved" ? (
          // 인증된 일지는 잠긴다 (인증 시간이 말없이 바뀌거나 줄어드는 것을 막음)
          <span className="inline-flex min-h-11 items-center gap-1 text-caption font-bold text-ink-soft" data-log-locked>
            🔒 인증 완료 · 수정 불가
          </span>
        ) : (
          <RowActions id={log.id} onEdit={() => setEditAt(Date.now())} deleteAction={delAction} deleting={deleting} />
        )}
      </div>
    </motion.li>
  );
}

// 지도교수 인증 상태. 일지를 고치면 다시 "인증 대기"가 된다
function StatusChip({ status }: { status: LogItem["status"] }) {
  if (status === "approved") return <Chip className="text-caption">✓ 인증 완료</Chip>;
  if (status === "rejected")
    return (
      <Chip tone="pink" className="text-caption">
        반려됨 · 수정 필요
      </Chip>
    );
  return (
    <Chip tone="warn" className="text-caption">
      인증 대기
    </Chip>
  );
}
