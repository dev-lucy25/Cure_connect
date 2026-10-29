"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { DROP_FACTORS, IV_LIMITS, ivRate } from "@/lib/iv";
import AnimatedNumber from "@/components/motion/animated-number";
import Card from "@/components/ui/card";
import Field from "@/components/ui/field";
import SelectField from "@/components/ui/select-field";

// 수액 주입 속도(gtt) 계산기: 입력하는 즉시 mL/hr · 분당 방울 수 · 몇 초마다 1방울.
// 결과 숫자는 굴러가며 바뀌고, 점적 챔버의 방울은 계산된 간격으로 실제로 떨어진다.
export default function IvCalculator() {
  const [volume, setVolume] = useState("1000");
  const [hours, setHours] = useState("8");
  const [factor, setFactor] = useState("20");
  const result = ivRate(Number(volume), Number(hours), Number(factor));
  const error = typeof result === "string" ? result : null;
  const id = useId();

  return (
    <Card>
      <span className="inline-block rounded-md bg-o-bg px-2.5 py-1 text-caption font-bold text-o-ink">병동 액팅 필수 도구</span>
      <h2 className="mt-2 text-title font-bold text-ink">💧 수액 주입 속도 (gtt) 계산기</h2>
      <p className="mt-1 text-body-sm text-ink-soft">처방된 총 수액량과 주입 시간을 넣으면 분당 방울 수와 몇 초마다 한 방울씩 떨어져야 하는지 바로 계산해요.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field
          id={`${id}-volume`}
          name="volume"
          label="총 수액 용량 (mL)"
          type="number"
          inputMode="decimal"
          min={IV_LIMITS.volumeMin}
          max={IV_LIMITS.volumeMax}
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
        />
        <Field
          id={`${id}-hours`}
          name="hours"
          label="총 주입 시간 (hr)"
          type="number"
          inputMode="decimal"
          min={IV_LIMITS.hoursMin}
          max={IV_LIMITS.hoursMax}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <SelectField id={`${id}-factor`} name="factor" label="수액 세트" value={factor} onChange={(e) => setFactor(e.target.value)}>
          {DROP_FACTORS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div aria-live="polite" className="mt-4 flex items-center justify-between gap-4 rounded-card bg-ink p-5 text-canvas">
        {error ? (
          <p role="alert" className="text-body-sm font-bold text-warn-bg">
            {error}
          </p>
        ) : (
          typeof result === "object" && (
            <div className="min-w-0 space-y-1">
              <p className="text-body-sm text-canvas/70">
                처방 유속 <AnimatedNumber value={result.mlPerHr} suffix=" mL/hr" className="font-bold text-brand" />
              </p>
              <p className="font-display text-headline leading-tight text-brand md:text-display">
                분당 <AnimatedNumber value={Math.round(result.gttPerMin)} format={{ maximumFractionDigits: 0 }} /> 방울
                <span className="ml-1 font-sans text-body-sm text-canvas/70">(gtt/min)</span>
              </p>
              <p className="text-body-sm font-bold text-warn-bg">
                ⏱️ 약 <AnimatedNumber value={result.secPerDrop} format={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }} />초마다 1방울씩 떨어지게 조절하세요
              </p>
            </div>
          )
        )}
        <DripChamber secPerDrop={typeof result === "object" ? result.secPerDrop : null} />
      </div>
    </Card>
  );
}

/** 점적 챔버: 계산된 간격(초)마다 방울이 하나씩 떨어진다. 너무 빠르면 0.25초, 느리면 6초로 보기 좋게 묶는다 */
function DripChamber({ secPerDrop }: { secPerDrop: number | null }) {
  const reduce = useReducedMotion();
  const interval = secPerDrop === null ? null : Math.min(6, Math.max(0.25, secPerDrop));
  const fall = interval === null ? 0 : Math.min(0.6, interval * 0.8);
  return (
    <div className="flex shrink-0 flex-col items-center" aria-hidden>
      <div className="relative h-16 w-8 overflow-hidden rounded-b-full border-2 border-canvas/40">
        {interval !== null && !reduce && (
          <motion.span
            key={interval}
            data-drip={interval.toFixed(2)}
            className="absolute top-0 left-1/2 -ml-1 block size-2 rounded-full bg-brand"
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: [-6, 44], opacity: [1, 1, 0] }}
            transition={{ duration: fall, ease: "easeIn", repeat: Infinity, repeatDelay: interval - fall }}
          />
        )}
        <span className="absolute inset-x-0 bottom-0 h-3 bg-brand/50" />
      </div>
      <span className="mt-1 text-[10px] text-canvas/60">점적 챔버</span>
    </div>
  );
}
