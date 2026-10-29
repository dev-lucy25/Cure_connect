"use client";

import { useActionState, useState, useTransition } from "react";
import { loadMoreLogs, removeLog, saveLog } from "@/server/practice-actions";
import type { FormState, LogField } from "@/lib/validation/practice";
import type { LogItem } from "@/server/practice-repo";
import { WEEKDAY, toDbDate } from "@/lib/dates";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
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
        <div className="flex items-center gap-2">
          <FormStatus savedAt={state.savedAt} />
          {!writing && (
            <Button type="button" variant="secondary" onClick={() => setOpenedAt(Date.now())} className="px-4 text-body-sm">
              <IconPlus size={18} /> 일지 쓰기
            </Button>
          )}
        </div>
      </div>
      {writing && (
        <LogForm action={action} state={state} pending={pending} today={today} onCancel={() => setOpenedAt(null)} />
      )}
      {items.length === 0 ? (
        !writing && (
          <div className="flex flex-col items-center rounded-card border border-dashed border-line px-5 py-8 text-center">
            <NurseTurtle stage={2} mood="empty" size={88} decorative />
            <p className="mt-2 font-bold">첫 일지를 써 볼까요?</p>
            <p className="mt-1 text-body-sm text-ink-soft">오늘 실습한 시간을 넣으면 진행률이 바로 올라가요</p>
          </div>
        )
      ) : (
        <LogList items={items} nextCursor={nextCursor} version={version} today={today} />
      )}
    </section>
  );
}

function LogList({
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
  // (목록 전체를 다시 만들지 않아 각 줄의 "저장됐어요" 표시는 남는다)
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

  return (
    <>
      <ul className="divide-y divide-line/70 rounded-card border border-line/70 bg-surface shadow-soft">
        {[...items, ...more].map((log) => (
          <LogRow key={log.id} log={log} today={today} />
        ))}
      </ul>
      {failed && <FormStatus message="일지를 더 불러오지 못했어요. 다시 눌러 주세요" />}
      {cursor && (
        <Button type="button" variant="ghost" block disabled={loading} onClick={loadMore}>
          {loading ? "불러오는 중..." : "더 보기"}
        </Button>
      )}
    </>
  );
}

function DateChip({ date }: { date: string }) {
  const d = toDbDate(date);
  return (
    <div className="w-11 shrink-0 text-center leading-tight">
      <p className="text-caption text-ink-soft">{d.getUTCMonth() + 1}월</p>
      <p className="font-display text-title text-ink">{d.getUTCDate()}</p>
      <p className="text-caption text-ink-soft">{WEEKDAY[d.getUTCDay()]}</p>
    </div>
  );
}

function LogRow({ log, today }: { log: LogItem; today: string }) {
  const [state, action, pending] = useActionState<FormState<LogField>, FormData>(saveLog, {});
  const [del, delAction, deleting] = useActionState<FormState<never>, FormData>(removeLog, {});
  const [editAt, setEditAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const editing = editAt !== null && !(state.savedAt && state.savedAt > editAt);
  const long = log.activities.length > 90 || log.activities.split("\n").length > 3;

  if (editing) {
    return (
      <li className="p-2">
        <LogForm action={action} state={state} pending={pending} today={today} initial={log} onCancel={() => setEditAt(null)} />
      </li>
    );
  }

  return (
    <li className="flex gap-3 px-4 pt-4 pb-1">
      <DateChip date={log.date} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold">{log.ward}</p>
            <p className="truncate text-body-sm text-ink-soft">{log.hospital}</p>
          </div>
          <span className="shrink-0 rounded-full bg-mint-soft px-2.5 py-0.5 text-body-sm font-bold text-mint-deep">
            {log.hours}시간
          </span>
        </div>
        <p className={`mt-2 whitespace-pre-line break-words text-body-sm ${long && !expanded ? "line-clamp-3" : ""}`}>
          {log.activities}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mr-auto min-h-11 text-body-sm font-bold text-mint-deep"
            >
              {expanded ? "접기" : "펼치기"}
            </button>
          )}
          <FormStatus message={del.message} />
          <FormStatus savedAt={state.savedAt} />
          <RowActions id={log.id} onEdit={() => setEditAt(Date.now())} deleteAction={delAction} deleting={deleting} />
        </div>
      </div>
    </li>
  );
}
