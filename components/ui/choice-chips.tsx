"use client";

import { useId } from "react";

// 알약 모양 고르기 묶음 (재사용). multiple이면 체크박스(여러 개), 아니면 라디오(하나).
// 진짜 input이라 폼 값으로 그대로 전송되고, 키보드·화면 읽기도 기본 동작을 따른다.
export default function ChoiceChips({
  name,
  legend,
  hint,
  options,
  multiple = false,
  defaultValue,
  onChange,
  className = "",
}: {
  name: string;
  legend: string;
  hint?: string;
  options: readonly { key: string; label: string }[];
  multiple?: boolean;
  defaultValue?: string | string[] | null;
  /** 고른 값이 바뀔 때 (라디오: 고른 키) */
  onChange?: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  const selected = new Set(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []);
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 block text-body-sm font-bold text-ink">{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-caption text-ink-soft">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.key} htmlFor={`${id}-${o.key}`} className="relative">
            <input
              id={`${id}-${o.key}`}
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.key}
              defaultChecked={selected.has(o.key)}
              onChange={onChange ? (e) => e.target.checked && onChange(o.key) : undefined}
              className="peer sr-only"
            />
            <span className="press inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3.5 text-body-sm font-medium text-ink-soft transition-colors peer-checked:border-brand-deep peer-checked:bg-brand-soft peer-checked:font-bold peer-checked:text-brand-deep peer-focus-visible:ring-2 peer-focus-visible:ring-brand-deep/40 hover:text-ink">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
