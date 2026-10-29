"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { ReviewLog } from "@/server/approval-repo";
import { reviewLogsAction } from "@/server/approval-actions";
import { shiftLabel, subjectLabel } from "@/lib/subjects";
import { shortDate } from "@/lib/dates";
import { SPRING_SOFT } from "@/lib/motion";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";
import { controlClass } from "@/components/ui/field-parts";

type Result = { message?: string; savedAt?: number; notice?: string };

const STATUS = {
  approved: { label: "✓ 인증 완료", tone: "brand" as const },
  rejected: { label: "반려됨", tone: "pink" as const },
  pending: { label: "인증 대기", tone: "warn" as const },
};

// 일지 인증 목록 (인증 대기함·학생 상세 공용). 대기 일지만 고르기·인증·반려(사유) 가능.
export default function ApprovalList({ logs, showStudent }: { logs: ReviewLog[]; showStudent: boolean }) {
  const pending = logs.filter((l) => l.status === "pending");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<Result>({});
  const [busy, startBusy] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const pickedIds = pending.filter((l) => picked.has(l.id)).map((l) => l.id);

  function review(ids: string[], decision: "approved" | "rejected", why = "") {
    startBusy(async () => {
      const r = await reviewLogsAction(ids, decision, why);
      setResult(r);
      if (r.savedAt) {
        setPicked(new Set());
        setRejecting(null);
        setReason("");
      }
    });
  }
  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-card border border-line bg-surface px-5 py-10 text-center shadow-soft">
        <NurseTurtle stage={3} mood="saved" size={88} decorative />
        <p className="mt-2 font-bold text-ink">{showStudent ? "인증을 기다리는 일지가 없어요" : "아직 기록한 일지가 없어요"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-3 shadow-soft">
          <Checkbox
            label={`대기 ${pending.length}건 모두 고르기`}
            checked={pickedIds.length === pending.length}
            onChange={(e) => setPicked(e.target.checked ? new Set(pending.map((l) => l.id)) : new Set())}
          />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy || pickedIds.length === 0}
              onClick={() => review(pickedIds, "approved")}
              className="min-h-11 px-4 text-body-sm"
            >
              선택한 {pickedIds.length}건 인증
            </Button>
          </div>
        </div>
      )}
      <FormStatus message={result.message} savedAt={result.savedAt} savedText={result.notice} />

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {logs.map((l) => (
            <motion.li
              key={l.id}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING_SOFT}
              className="rounded-card border border-line bg-surface p-4 shadow-soft"
              data-review-log={l.status}
            >
              <div className="flex items-start gap-2">
                {l.status === "pending" && (
                  <Checkbox
                    label={<span className="sr-only">고르기</span>}
                    checked={picked.has(l.id)}
                    onChange={() => toggle(l.id)}
                    className="-ml-1"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {showStudent && (
                    <Link href={`/prof/students/${l.studentId}`} className="text-body-sm font-bold text-brand-deep hover:underline">
                      {l.studentName}
                      {l.memberNo && <span className="ml-1 font-medium text-ink-soft">{l.memberNo}</span>}
                    </Link>
                  )}
                  <p className="font-bold text-ink">
                    {shortDate(l.date)} · {l.ward}
                    {l.shift && <span className="ml-1 text-body-sm font-medium text-ink-soft">{shiftLabel(l.shift)}</span>}
                  </p>
                  <p className="text-body-sm text-ink-soft">
                    {l.hospital} · {subjectLabel(l.subject)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-body-sm break-words text-ink">{l.activities}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Chip>+{l.hours}시간</Chip>
                  <Chip tone={STATUS[l.status].tone} className="text-caption">
                    {STATUS[l.status].label}
                  </Chip>
                </div>
              </div>
              {l.status === "pending" &&
                (rejecting === l.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={200}
                      placeholder="반려 사유 (선택) · 예: 시간이 일정과 맞지 않아요"
                      aria-label="반려 사유"
                      className={`${controlClass()} min-h-11 min-w-0 flex-1 px-3 text-body-sm`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => review([l.id], "rejected", reason)}
                      className="min-h-11 px-3 text-body-sm text-danger"
                    >
                      반려하기
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setRejecting(null)} className="min-h-11 px-3 text-body-sm">
                      취소
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setRejecting(l.id)}
                      className="min-h-11 px-3 text-body-sm"
                    >
                      반려
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => review([l.id], "approved")}
                      className="min-h-11 px-4 text-body-sm"
                      aria-label={`${l.studentName} ${shortDate(l.date)} 일지 인증`}
                    >
                      인증
                    </Button>
                  </div>
                ))}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
