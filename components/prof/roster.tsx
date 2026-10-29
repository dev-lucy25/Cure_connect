"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { RosterFilter, RosterRow, StudentStatus } from "@/server/professor-repo";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import AnimatedNumber from "@/components/motion/animated-number";
import ProgressBar from "@/components/motion/progress-bar";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import { buttonClass } from "@/components/ui/button-class";
import Chip from "@/components/ui/chip";

const FILTERS: { key: RosterFilter; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "RISK", label: "위험군" },
  { key: "ROOM", label: "같은 방 코드만" },
];

const STATUS: Record<StudentStatus, { label: string; tone: "pink" | "warn" | "brand" }> = {
  DONE: { label: "🎓 이수 완료", tone: "pink" },
  RISK: { label: "⚠️ 미달 위험", tone: "warn" },
  NORMAL: { label: "정상 이수중", tone: "brand" },
};

function matches(row: RosterRow, filter: RosterFilter) {
  if (filter === "RISK") return row.status === "RISK";
  if (filter === "ROOM") return row.sameRoom;
  return true;
}

const subline = (r: RosterRow) => [r.memberNo, r.classLabel, r.orgName].filter(Boolean).join(" · ");

// 학생 현황판: 필터(선택 알약이 미끄러짐) + CSV 내려받기.
// md 이상은 표, 모바일은 카드 목록. 필터를 바꾸면 줄이 부드럽게 빠지고 들어온다.
export default function Roster({ rows, hasRoom }: { rows: RosterRow[]; hasRoom: boolean }) {
  const tap = useTapEffect();
  const [filter, setFilter] = useState<RosterFilter>("ALL");
  const shown = rows.filter((r) => matches(r, filter));
  const filters = hasRoom ? FILTERS : FILTERS.filter((f) => f.key !== "ROOM");

  return (
    <section className="rounded-card border border-line bg-surface shadow-soft">
      <div className="flex flex-col gap-3 p-5 pb-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-title font-bold text-ink">학생 실습 현황판</h2>
          <p className="mt-0.5 text-body-sm text-ink-soft">누적은 학생이 기록한 시간, 인증은 교수님이 확인한 시간이에요</p>
        </div>
        <a href="/api/prof/export" download className={`${buttonClass("ghost")} shrink-0`}>
          📥 인증평가용 CSV 내려받기
        </a>
      </div>

      <div role="tablist" aria-label="학생 필터" className="flex gap-1.5 overflow-x-auto px-5 pb-3">
        {filters.map((f) => {
          const active = filter === f.key;
          const count = rows.filter((r) => matches(r, f.key)).length;
          return (
            <motion.button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              whileTap={tap}
              onClick={() => setFilter(f.key)}
              className={`relative isolate inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3.5 text-body-sm font-bold transition-colors ${active ? "text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {active && (
                <motion.span
                  layoutId="roster-filter-pill"
                  transition={SPRING_SNAPPY}
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full bg-brand"
                />
              )}
              {f.label} <span className="font-medium opacity-80">{count}</span>
            </motion.button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center px-5 pt-2 pb-8 text-center">
          <NurseTurtle stage={2} size={80} decorative />
          <p className="mt-2 font-bold text-ink">{rows.length === 0 ? "아직 연결된 학생이 없어요" : "이 조건에 맞는 학생이 없어요"}</p>
          {rows.length === 0 && <p className="mt-1 text-body-sm text-ink-soft">학생에게 방 코드를 알려 주면 여기에 나타나요</p>}
        </div>
      ) : (
        <>
          {/* 모바일: 카드 */}
          <ul className="space-y-2 px-3 pb-3 md:hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={SPRING_SOFT}
                  className="rounded-control bg-subtle p-4"
                  data-roster-card
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-ink">
                        {r.name}
                        {r.sameRoom && <span className="ml-1.5 text-caption font-medium text-brand-deep">🔑 내 방</span>}
                      </p>
                      <p className="text-caption text-ink-soft">{subline(r)}</p>
                    </div>
                    <Chip tone={STATUS[r.status].tone} className="shrink-0 text-caption">
                      {STATUS[r.status].label}
                    </Chip>
                  </div>
                  <p className="mt-2 text-body-sm text-ink-soft">
                    {r.place ?? "실습 기록 없음"} · 인증 <AnimatedNumber value={r.approvedHours} suffix="h" />
                  </p>
                  <Progress row={r} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {/* md 이상: 표 */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-body-sm">
              <thead className="border-y border-line bg-subtle text-caption text-ink-soft">
                <tr>
                  <th className="px-5 py-2.5 font-bold">학생</th>
                  <th className="px-3 py-2.5 font-bold">현재 실습지</th>
                  <th className="w-64 px-3 py-2.5 font-bold">누적 / 기준</th>
                  <th className="px-3 py-2.5 font-bold">인증</th>
                  <th className="px-5 py-2.5 font-bold">상태</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {shown.map((r) => (
                    <motion.tr
                      key={r.id}
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={SPRING_SOFT}
                      className="border-b border-line/70 last:border-0"
                      data-roster-row
                    >
                      <td className="px-5 py-3">
                        <p className="font-bold text-ink">
                          {r.name}
                          {r.sameRoom && <span className="ml-1.5 text-caption font-medium text-brand-deep">🔑 내 방</span>}
                        </p>
                        <p className="text-caption text-ink-soft">{subline(r)}</p>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{r.place ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Progress row={r} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-soft">
                        <AnimatedNumber value={r.approvedHours} suffix="h" />
                      </td>
                      <td className="px-5 py-3">
                        <Chip tone={STATUS[r.status].tone} className="text-caption whitespace-nowrap">
                          {STATUS[r.status].label}
                        </Chip>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Progress({ row }: { row: RosterRow }) {
  return (
    <div className="mt-2 md:mt-0">
      <p className="flex items-baseline justify-between gap-2 text-caption text-ink-soft">
        <span className="whitespace-nowrap">
          <AnimatedNumber value={row.hours} className="font-bold text-ink" /> / {row.goalHours.toLocaleString("ko-KR")}h
        </span>
        <AnimatedNumber value={row.percent} suffix="%" />
      </p>
      <ProgressBar
        percent={row.percent}
        minPercent={row.hours > 0 ? 3 : 0}
        label={`${row.name} 달성률`}
        className="mt-1 h-2 overflow-hidden rounded-full bg-surface md:bg-subtle"
        barClassName={`h-full rounded-full ${row.status === "DONE" ? "bg-pink" : row.status === "RISK" ? "bg-warn-line" : "bg-brand"}`}
      />
    </div>
  );
}
