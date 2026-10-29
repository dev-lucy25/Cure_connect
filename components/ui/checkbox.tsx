"use client";

import type { ComponentProps, ReactNode } from "react";

// 공용 체크박스: 진짜 input(키보드·화면 읽기·폼 전송 기본 동작) + 둥근 네모. 체크하면 민트로 채워지고 체크 표시가 그려진다.
// description: 라벨 아래 회색 설명. 터치 영역 44px.
export default function Checkbox({
  label,
  description,
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={`group inline-flex min-h-11 cursor-pointer items-start gap-3 py-2.5 text-body-sm text-ink ${className}`}>
      <span className="relative mt-px inline-flex size-[22px] shrink-0">
        <input
          type="checkbox"
          className="peer absolute inset-0 size-[22px] cursor-pointer appearance-none rounded-[7px] border-2 border-line-strong bg-surface transition-[background-color,border-color,transform] duration-200 group-hover:border-brand-deep/60 checked:border-brand-deep checked:bg-brand-deep active:scale-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-surface peer-checked:[&_path]:[stroke-dashoffset:0]"
        >
          <path
            d="M3.5 8.5l3 3 6-7"
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-[stroke-dashoffset] duration-300 ease-out [stroke-dasharray:1] [stroke-dashoffset:1]"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-caption text-ink-soft">{description}</span>}
      </span>
    </label>
  );
}
