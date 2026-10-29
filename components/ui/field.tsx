import type { ComponentProps } from "react";

// 라벨 + 입력 칸 + 칸 바로 아래 오류 안내. 한 화면에 같은 name이 여러 번 나오면 id를 따로 준다.
export default function Field({
  label,
  error,
  name,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; name: string; error?: string }) {
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-body-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-(--size-touch) w-full rounded-control border bg-surface px-4 text-body text-ink outline-none transition placeholder:text-ink-soft/70 focus:ring-3 focus:ring-brand-soft ${
          error ? "border-danger" : "border-line focus:border-brand-deep"
        }`}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-body-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
