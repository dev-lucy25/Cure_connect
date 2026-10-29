import type { ComponentProps } from "react";

// 라벨 + 고르기 칸 + 칸 바로 아래 오류 안내 (Field와 같은 모양)
export default function SelectField({
  label,
  error,
  name,
  id,
  className = "",
  children,
  ...props
}: ComponentProps<"select"> & { label: string; name: string; error?: string }) {
  const selectId = id ?? name;
  const errorId = `${selectId}-error`;
  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1.5 block text-body-sm font-bold text-ink">
        {label}
      </label>
      <select
        id={selectId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-(--size-touch) w-full rounded-control border bg-surface px-4 text-body text-ink outline-none transition focus:ring-3 focus:ring-brand-soft ${
          error ? "border-danger" : "border-line focus:border-brand-deep"
        }`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-body-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
