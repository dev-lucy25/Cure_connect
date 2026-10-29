"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { labelClass } from "@/components/ui/field-parts";

// 두세 개 중 하나를 고르는 세그먼트 컨트롤 (진짜 라디오라 폼 값으로 그대로 전송된다).
// 고른 칸 뒤의 흰 알약이 스프링으로 미끄러져 따라간다.
export default function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  size = "md",
}: {
  name: string;
  legend: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  error?: string;
  size?: "sm" | "md";
}) {
  // 같은 화면에 묶음이 여러 개일 수 있어 묶음마다 다른 layoutId
  const pillId = useId();
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div
        className="grid gap-1 rounded-control bg-subtle p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={`relative isolate flex cursor-pointer items-center justify-center rounded-xl px-2 text-center font-bold transition-colors has-focus-visible:outline-3 has-focus-visible:outline-brand-deep ${
              size === "sm" ? "min-h-10 text-caption" : "min-h-11 text-body-sm"
            } ${value === o.value ? "text-ink" : "text-ink-soft hover:text-ink"}`}
          >
            {value === o.value && (
              <motion.span
                layoutId={pillId}
                transition={SPRING_SNAPPY}
                aria-hidden
                className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.06),0_2px_8px_-2px_rgb(0_0_0/0.08)]"
              />
            )}
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && <p className="animate-field-in mt-1.5 text-body-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}
