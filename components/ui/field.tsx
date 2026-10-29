import type { ComponentProps } from "react";

// 라벨 + 입력 칸 + 칸 바로 아래 오류 안내
export default function Field({
  label,
  error,
  name,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; name: string; error?: string }) {
  const errorId = `${name}-error`;
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-body-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-(--size-touch) w-full rounded-control border-2 bg-cream px-4 text-body text-ink outline-none transition placeholder:text-ink-soft/70 focus:bg-surface ${
          error ? "border-danger" : "border-line focus:border-mint-deep"
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
