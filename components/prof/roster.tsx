"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { RosterFilter, RosterRow } from "@/server/professor-repo";
import { nudgeAction } from "@/server/professor-actions";
import { SPRING_SNAPPY, SPRING_SOFT } from "@/lib/motion";
import { GRADUATION_HOURS, STATUS_TEXT } from "@/lib/practice-status";
import AnimatedNumber from "@/components/motion/animated-number";
import ProgressBar from "@/components/motion/progress-bar";
import { useTapEffect } from "@/components/motion/use-motion-prefs";
import NurseTurtle from "@/components/mascot/nurse-turtle";
import { buttonClass } from "@/components/ui/button-class";
import Link from "next/link";
import Chip from "@/components/ui/chip";
import FormStatus from "@/components/ui/form-status";

const FILTERS: { key: RosterFilter; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "RISK", label: "위험군" },
  { key: "SHORT", label: "보충 검토" },
  { key: "ROOM", label: "같은 방 코드만" },
];

function matches(row: RosterRow, filter: RosterFilter) {
  if (filter === "RISK") return row.status === "RISK";
  if (filter === "SHORT") return row.shortfall > 0;
  if (filter === "ROOM") return row.sameRoom;
  return true;
}

/** 이름·학번 일부로 찾기 (띄어쓰기·대소문자 무시) */
function found(row: RosterRow, q: string) {
  const norm = (v: string) => v.replace(/s+/g, "").toLowerCase();
  const query = norm(q);
  return !query || norm(row.name).includes(query) || norm(row.memberNo ?? "").includes(query);
}

const subline = (r: RosterRow) => [r.memberNo, r.classLabel, r.orgName].filter(Boolean).join(" · ");

type NudgeState = { message?: string; sentAt?: number; notice?: string };

// 학생 현황판: 필터(선택 알약이 미끄러짐) + CSV 내려받기 + 독려 알림(학생당 하루 1번).
// md 이상은 표, 모바일은 카드 목록. 필터를 바꾸면 줄이 부드럽게 빠지고 들어온다.
export default function Roster({ rows, hasRoom, hasOrg }: { rows: RosterRow[]; hasRoom: boolean; hasOrg: boolean }) {
  const tap = useTapEffect();
  const [filter, setFilter] = useState<RosterFilter>("ALL");
  const [query, setQuery] = useState("");
  const shown = rows.filter((r) => matches(r, filter) && found(r, query));
  const filters = hasRoom ? FILTERS : FILTERS.filter((f) => f.key !== "ROOM");
  const [nudge, setNudge] = useState<NudgeState>({});
  const [sending, setSending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const notNudged = shown.filter((r) => !r.nudgedToday);

  // key: 누르고 있는 버튼("all" 또는 학생 id) — 그 버튼만 "보내는 중"으로 바뀐다
  function send(key: string, ids: string[]) {
    setSending(key);
    startTransition(async () => {
      setNudge(await nudgeAction(ids));
      setSending(null);
    });
  }
  const nudgeButton = (r: RosterRow) => (
    <NudgeButton
      nudged={r.nudgedToday}
      pending={sending === r.id}
      disabled={sending !== null}
      onClick={() => send(r.id, [r.id])}
      name={r.name}
    />
  );

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

      {rows.length > 0 && (
        <div className="px-5 pb-3">
          <label className="sr-only" htmlFor="roster-search">
            학생 이름·학번 검색
          </label>
          <input
            id="roster-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 이름·학번으로 찾기"
            className="min-h-11 w-full rounded-control border border-line bg-canvas px-4 text-body-sm text-ink placeholder:text-ink-soft focus:border-brand-deep focus:outline-none md:w-72"
          />
        </div>
      )}

      {shown.length > 0 && (
        <div className="space-y-2 px-5 pb-3">
          <motion.button
            type="button"
            whileTap={tap}
            disabled={notNudged.length === 0 || sending !== null}
            onClick={() =>
              send(
                "all",
                notNudged.map((r) => r.id),
              )
            }
            className={`${buttonClass("secondary")} min-h-11 w-full text-body-sm md:w-auto`}
          >
            {sending === "all"
              ? "보내는 중..."
              : notNudged.length === 0
                ? "✓ 오늘 모두 독려했어요"
                : `🔔 보이는 학생 ${notNudged.length}명에게 독려 알림`}
          </motion.button>
          <FormStatus message={nudge.message} savedAt={nudge.sentAt} savedText={nudge.notice} />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center px-5 pt-2 pb-8 text-center">
          <NurseTurtle stage={2} size={80} decorative />
          <p className="mt-2 font-bold text-ink">{rows.length === 0 ? "아직 연결된 학생이 없어요" : "이 조건에 맞는 학생이 없어요"}</p>
          {rows.length === 0 && (
            <p className="mt-1 text-body-sm text-ink-soft">
              {hasRoom
                ? "학생에게 방 코드를 알려 주면 가입하거나 내 정보에서 입력할 때 여기에 나타나요"
                : hasOrg
                  ? "같은 학교 학생이 가입하면 여기에 나타나요. 위에서 방 코드를 만들어 실습반을 따로 모을 수도 있어요"
                  : "위에서 실습반 방 코드를 만들고 학생들에게 알려 주세요"}
            </p>
          )}
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
                        <Link href={`/prof/students/${r.id}`} className="hover:text-brand-deep hover:underline">
                          {r.name}
                        </Link>
                        {r.sameRoom && <span className="ml-1.5 text-caption font-medium text-brand-deep">🔑 내 방</span>}
                      </p>
                      <p className="text-caption text-ink-soft">{subline(r)}</p>
                    </div>
                    <Chip tone={STATUS_TEXT[r.status].tone} className="shrink-0 text-caption">
                      {STATUS_TEXT[r.status].label}
                    </Chip>
                  </div>
                  <p className="mt-2 text-body-sm text-ink-soft">
                    {r.place ?? "실습 기록 없음"} · 인증 <AnimatedNumber value={r.approvedHours} suffix="h" />
                  </p>
                  <Progress row={r} />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Shortfall row={r} />
                    {nudgeButton(r)}
                  </div>
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
                  <th className="px-3 py-2.5 font-bold">상태</th>
                  <th className="px-5 py-2.5 text-right font-bold">독려 알림</th>
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
                          <Link href={`/prof/students/${r.id}`} className="hover:text-brand-deep hover:underline">
                            {r.name}
                          </Link>
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
                      <td className="px-3 py-3">
                        <Chip tone={STATUS_TEXT[r.status].tone} className="text-caption whitespace-nowrap">
                          {STATUS_TEXT[r.status].label}
                        </Chip>
                        <Shortfall row={r} />
                      </td>
                      <td className="px-5 py-3 text-right">{nudgeButton(r)}</td>
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

/** 보충실습 검토: 앞으로 잡힌 일정을 다 해도 모자라는 시간 */
function Shortfall({ row }: { row: RosterRow }) {
  if (row.shortfall <= 0) return null;
  return (
    <span className="mt-1 block text-caption font-bold text-warn-ink" data-shortfall={row.shortfall}>
      예정 일정 다 해도 {row.shortfall.toLocaleString("ko-KR")}시간 부족
    </span>
  );
}

function Progress({ row }: { row: RosterRow }) {
  return (
    <div className="mt-2 md:mt-0">
      <p className="flex items-baseline justify-between gap-2 text-caption text-ink-soft">
        <span className="whitespace-nowrap">
          <AnimatedNumber value={row.hours} className="font-bold text-ink" /> / {GRADUATION_HOURS.toLocaleString("ko-KR")}h
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

/** 학생 한 명 독려 버튼. 오늘 이미 받았으면 "오늘 보냄"으로 잠긴다 */
function NudgeButton({
  nudged,
  pending,
  disabled,
  onClick,
  name,
}: {
  nudged: boolean;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
  name: string;
}) {
  const tap = useTapEffect();
  if (nudged)
    return <span className="inline-flex min-h-11 items-center text-caption font-bold whitespace-nowrap text-ink-soft">✓ 오늘 보냄</span>;
  return (
    <motion.button
      type="button"
      whileTap={tap}
      disabled={disabled}
      onClick={onClick}
      aria-label={`${name} 학생에게 독려 알림 보내기`}
      className="inline-flex min-h-11 items-center rounded-full bg-subtle px-3.5 text-caption font-bold whitespace-nowrap text-ink hover:bg-brand-soft disabled:opacity-55 md:bg-canvas"
    >
      {pending ? "보내는 중..." : "🔔 독려"}
    </motion.button>
  );
}
