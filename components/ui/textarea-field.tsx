import type { ComponentProps, ReactNode } from "react";

// 라벨 + 여러 줄 입력 + 칸 바로 아래 안내(경고)·오류. 한 화면에 같은 name이 여러 번 나오면 id를 따로 준다.
export default function TextareaField({
  label,
  error,
  hint,
  name,
  id,
  className = "",
  ...props
}: ComponentProps<"textarea"> & { label: string; name: string; error?: string; hint?: ReactNode }) {
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-body-sm font-bold text-ink">
        {label}
      </label>
      <textarea
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`min-h-28 w-full resize-y rounded-control border bg-surface px-4 py-3 text-body text-ink outline-none transition placeholder:text-ink-soft/70 focus:ring-3 focus:ring-brand-soft ${
          error ? "border-danger" : "border-line focus:border-brand-deep"
        }`}
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-body-sm font-medium text-pink-deep">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-body-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
