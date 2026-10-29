import type { ReactNode } from "react";

// 입력 부품 공통 모양 (Field · SelectField · TextareaField · 검색 칸이 함께 쓴다).
// 2026 개편: 옅은 회색으로 채운 칸 → 마우스를 올리면 테두리, 누르면 흰 바탕 + 민트 테두리 + 은은한 빛. 오류는 빨간 테두리·빛.

export const labelClass = "mb-2 block text-body-sm font-bold text-ink";

/** 칸 모양 클래스 (크기·여백은 쓰는 쪽에서) */
export function controlClass(invalid = false) {
  return `w-full rounded-control border text-body text-ink outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-ink-soft/60 focus:bg-surface disabled:cursor-not-allowed disabled:opacity-55 ${
    invalid
      ? "border-danger bg-danger-soft/50 focus:danger-glow"
      : "border-transparent bg-ink/5 hover:border-line-strong focus:border-brand-deep focus:focus-glow"
  }`;
}

/** 칸 바로 아래 안내(회색, warn이면 분홍 경고)·오류(빨강, 느낌표). id는 칸의 aria-describedby와 맞춘다 */
export function FieldMessages({
  id,
  hint,
  error,
  hintTone = "info",
}: {
  id: string;
  hint?: ReactNode;
  error?: string;
  hintTone?: "info" | "warn";
}) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className={`mt-1.5 text-body-sm ${hintTone === "warn" ? "font-medium text-pink-deep" : "text-ink-soft"}`}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="animate-field-in mt-1.5 flex items-start gap-1.5 text-body-sm font-medium text-danger">
          <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0">
            <circle cx="8" cy="8" r="7" fill="currentColor" />
            <path d="M8 4.5v4.2M8 11.2v.3" stroke="var(--color-surface)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </>
  );
}

/** 안내·오류가 있을 때 칸에 붙일 aria-describedby */
export function describedBy(id: string, hint?: ReactNode, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}
