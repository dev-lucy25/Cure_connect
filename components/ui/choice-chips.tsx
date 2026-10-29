"use client";

import { useId } from "react";
import { labelClass } from "@/components/ui/field-parts";

// 알약 모양 고르기 묶음 (재사용). multiple이면 체크박스(여러 개), 아니면 라디오(하나).
// 고르면 민트로 채워지고, 여러 개 고르기는 앞에 체크 표시가 펼쳐진다.
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
      <legend className={labelClass}>{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-caption text-ink-soft">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.key} htmlFor={`${id}-${o.key}`} className="group/chip relative">
            <input
              id={`${id}-${o.key}`}
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.key}
              defaultChecked={selected.has(o.key)}
              onChange={onChange ? (e) => e.target.checked && onChange(o.key) : undefined}
              className="peer sr-only"
            />
            <span className="press inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3.5 text-body-sm font-medium text-ink-soft transition-[background-color,border-color,color] duration-200 peer-checked:border-brand-deep peer-checked:bg-brand-soft peer-checked:font-bold peer-checked:text-brand-deep peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-deep hover:border-line-strong hover:text-ink">
              {multiple && (
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="-ml-1 w-0 shrink-0 opacity-0 transition-[width,margin,opacity] duration-200 group-has-checked/chip:mr-1 group-has-checked/chip:w-3.5 group-has-checked/chip:opacity-100"
                >
                  <path
                    d="M3.5 8.5l3 3 6-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
