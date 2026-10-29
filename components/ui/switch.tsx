"use client";

import type { ComponentProps, ReactNode } from "react";

// 켜기·끄기 스위치: 진짜 체크박스(role="switch")라 키보드(스페이스)·화면 읽기·폼 전송이 기본 동작.
// 켜면 트랙이 민트로 채워지고 손잡이가 살짝 튕기며 오른쪽으로 간다. 줄 전체가 누르는 곳(44px 이상).
export default function Switch({
  label,
  description,
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type" | "role"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center justify-between gap-4 py-2 ${className}`}>
      <span className="min-w-0">
        <span className="block text-body font-bold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-body-sm text-ink-soft">{description}</span>}
      </span>
      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors duration-200 checked:bg-brand-deep focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-checked:translate-x-5 peer-active:scale-x-110"
        />
      </span>
    </label>
  );
}
