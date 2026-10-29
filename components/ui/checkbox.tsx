"use client";

import type { ComponentProps, ReactNode } from "react";

// 공용 체크박스: 진짜 input(키보드·화면 읽기 기본 동작) + 둥근 네모 체크 표시. 터치 영역 44px.
export default function Checkbox({ label, className = "", ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-body-sm text-ink ${className}`}>
      <span className="relative inline-flex size-5 shrink-0">
        <input
          type="checkbox"
          className="peer absolute inset-0 size-5 cursor-pointer appearance-none rounded-md border-2 border-line bg-surface transition-colors checked:border-brand-deep checked:bg-brand-deep focus-visible:ring-2 focus-visible:ring-brand-deep/40 focus-visible:outline-none"
          {...props}
        />
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute inset-0 m-auto size-3.5 scale-50 text-surface opacity-0 transition-[opacity,transform] peer-checked:scale-100 peer-checked:opacity-100"
        >
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label}
    </label>
  );
}
