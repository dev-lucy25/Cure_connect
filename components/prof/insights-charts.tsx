"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Cell } from "@/server/insights-repo";
import { SPRING_SOFT } from "@/lib/motion";

// 익명 통계 차트 조각 (단일 계열 → 범례 없음, 제목이 계열 이름).
// 크기는 한 가지 색(브랜드)의 진하기로만, 값 글자는 기본 글자색. 5명 미만 칸은 빗금(숨김)으로 표시.
export const HIDDEN_NOTE = "응답 학생이 5명 미만이라 숨겼어요";

// 서버 컴포넌트에서 넘길 수 있게 함수 대신 단위 이름으로 받는다
export type ValueUnit = "level" | "percent" | "score";
const FORMAT: Record<ValueUnit, (v: number) => string> = { level: (v) => v.toFixed(1), percent: (v) => `${v}%`, score: (v) => `${v}점` };

const hatch = { backgroundImage: "repeating-linear-gradient(45deg, var(--color-line) 0 2px, transparent 2px 7px)" };

/** 가로 막대 목록 (+ 마우스·키보드 설명) */
export function BarList({
  items,
  max,
  unit,
  caption,
}: {
  items: { key: string; label: string; cell: Cell; extra?: string }[];
  max: number;
  unit: ValueUnit;
  caption: string;
}) {
  const format = FORMAT[unit];
  const [hover, setHover] = useState<string | null>(null);
  return (
    <figure>
      <ul className="space-y-2" aria-label={caption}>
        {items.map((it) => {
          const pct = it.cell ? Math.max(2, (it.cell.value / max) * 100) : 0;
          const tip = it.cell
            ? `${it.label}: ${format(it.cell.value)} · 응답 학생 ${it.cell.students}명${it.extra ? ` · ${it.extra}` : ""}`
            : `${it.label}: ${HIDDEN_NOTE}`;
          return (
            <li
              key={it.key}
              tabIndex={0}
              onMouseEnter={() => setHover(it.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(it.key)}
              onBlur={() => setHover(null)}
              aria-label={tip}
              className="relative grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-2 rounded-control px-1 py-1 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-deep/40 md:grid-cols-[9rem_1fr_4rem]"
              data-bar={it.key}
            >
              <span className="truncate text-ink">{it.label}</span>
              <span className="relative h-3 rounded-full bg-subtle" aria-hidden>
                {it.cell ? (
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={SPRING_SOFT}
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-deep"
                  />
                ) : (
                  <span className="absolute inset-0 rounded-full" style={hatch} />
                )}
              </span>
              <span className={`text-right tabular-nums ${it.cell ? "font-bold text-ink" : "text-caption text-ink-soft"}`}>
                {it.cell ? format(it.cell.value) : "—"}
              </span>
              {hover === it.key && (
                <span
                  role="tooltip"
                  className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-control bg-ink px-3 py-1.5 text-caption whitespace-nowrap text-canvas shadow-soft"
                >
                  {tip}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <TableView
        head={["항목", "값", "응답 학생"]}
        rows={items.map((it) => [it.label, it.cell ? format(it.cell.value) : "숨김", it.cell ? `${it.cell.students}명` : "5명 미만"])}
      />
    </figure>
  );
}

/** 병동 × 술기 히트맵 (그 병동 일지 중 그 술기를 고른 %) */
export function Heatmap({
  rows,
  skills,
}: {
  rows: { ward: string; label: string; cells: { skill: string; cell: Cell }[] }[];
  skills: { key: string; label: string }[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <figure>
      <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <table className="w-full min-w-[44rem] border-separate border-spacing-0.5 text-caption">
          <thead>
            <tr>
              <th className="w-20 text-left font-bold text-ink-soft">병동</th>
              {skills.map((s) => (
                <th key={s.key} className="h-16 align-bottom font-medium text-ink-soft">
                  <span className="inline-block max-w-[4.5rem] leading-tight break-keep">{s.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ward}>
                <th className="text-left font-bold text-ink">{r.label}</th>
                {r.cells.map(({ skill, cell }) => {
                  const id = `${r.ward}-${skill}`;
                  const label = skills.find((s) => s.key === skill)?.label ?? skill;
                  const tip = cell
                    ? `${r.label} · ${label}: 일지의 ${cell.value}% (학생 ${cell.students}명)`
                    : `${r.label} · ${label}: ${HIDDEN_NOTE}`;
                  return (
                    <td
                      key={skill}
                      tabIndex={0}
                      aria-label={tip}
                      onMouseEnter={() => setHover(id)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(id)}
                      onBlur={() => setHover(null)}
                      className="relative h-9 rounded-md text-center font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand-deep/60"
                      style={
                        cell
                          ? {
                              backgroundColor: `color-mix(in oklab, var(--color-brand-deep) ${12 + cell.value * 0.8}%, var(--color-surface))`,
                            }
                          : hatch
                      }
                      data-heat={id}
                    >
                      <span className={cell && cell.value >= 55 ? "text-surface" : "text-ink"}>{cell ? cell.value : ""}</span>
                      {hover === id && (
                        <span
                          role="tooltip"
                          className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-control bg-ink px-3 py-1.5 font-medium whitespace-nowrap text-canvas shadow-soft"
                        >
                          {tip}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-caption text-ink-soft">
        숫자는 그 병동 일지 중 그 술기를 어렵다고 고른 비율(%)이에요. 빗금은 학생 5명 미만이라 숨긴 칸이에요.
      </p>
    </figure>
  );
}

/** 주별 평균 난이도 꺾은선 (1~5). 숨긴 주는 선을 끊는다 */
export function WeeklyLine({ points }: { points: { week: string; avg: Cell }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 180;
  const pad = { l: 28, r: 24, t: 12, b: 26 };
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.t + ((5 - v) * (H - pad.t - pad.b)) / 4;
  // 숨긴 주에서 선을 끊어 여러 조각으로
  const segments: { i: number; v: number }[][] = [];
  points.forEach((p, i) => {
    if (!p.avg) return segments.push([]);
    if (!segments.length) segments.push([]);
    segments[segments.length - 1].push({ i, v: p.avg.value });
  });
  return (
    <figure>
      {/* 좁은 화면에선 글자가 너무 작아지지 않게 최소 너비를 두고 안쪽에서 가로 스크롤 */}
      <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[34rem]" role="img" aria-label="최근 8주 주별 평균 난이도">
          {[1, 2, 3, 4, 5].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-ink-soft)">
                {v}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <text key={p.week} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--color-ink-soft)">
              {p.week.slice(5).replace("-", "/")}
            </text>
          ))}
          {segments
            .filter((s) => s.length > 1)
            .map((s, k) => (
              <polyline
                key={k}
                points={s.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
                fill="none"
                stroke="var(--color-brand-deep)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          {points.map((p, i) =>
            p.avg ? (
              <g
                key={p.week}
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ outline: "none" }}
              >
                <circle cx={x(i)} cy={y(p.avg.value)} r={14} fill="transparent" />
                <circle
                  cx={x(i)}
                  cy={y(p.avg.value)}
                  r={4.5}
                  fill="var(--color-brand-deep)"
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                />
              </g>
            ) : null,
          )}
          {hover !== null && points[hover]?.avg && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--color-ink-soft)" strokeDasharray="3 3" />
              <rect x={Math.min(W - 170, Math.max(0, x(hover) - 80))} y={2} width={160} height={24} rx={8} fill="var(--color-ink)" />
              <text x={Math.min(W - 90, Math.max(80, x(hover)))} y={18} textAnchor="middle" fontSize={12} fill="var(--color-canvas)">
                {`${points[hover].week.slice(5).replace("-", "/")} 주 · 평균 ${points[hover].avg!.value} (${points[hover].avg!.students}명)`}
              </text>
            </g>
          )}
        </svg>
      </div>
      <TableView
        head={["주 시작일", "평균 난이도", "응답 학생"]}
        rows={points.map((p) => [p.week, p.avg ? String(p.avg.value) : "숨김", p.avg ? `${p.avg.students}명` : "5명 미만"])}
      />
    </figure>
  );
}

/** 접어 둔 표 보기 (색만으로 읽지 않게) */
function TableView({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <details className="mt-2 text-caption text-ink-soft">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold hover:text-ink">표로 보기</summary>
      <table className="mt-1 w-full text-left">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-line py-1.5 pr-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border-b border-line/60 py-1.5 pr-3 text-ink">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
