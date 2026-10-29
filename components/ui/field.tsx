import type { ComponentProps, ReactNode } from "react";
import { controlClass, describedBy, FieldMessages, labelClass } from "@/components/ui/field-parts";

// 라벨 + 입력 칸 + 칸 바로 아래 안내·오류. 한 화면에 같은 name이 여러 번 나오면 id를 따로 준다.
// suffix: 칸 안 오른쪽 단위 글자(예: "분", "mL")
export default function Field({
  label,
  error,
  hint,
  suffix,
  name,
  id,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; name: string; error?: string; hint?: ReactNode; suffix?: string }) {
  const inputId = id ?? name;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(inputId, hint, error)}
          className={`${controlClass(Boolean(error))} min-h-(--size-touch) px-4 ${suffix ? "pr-12" : ""}`}
          {...props}
        />
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body-sm font-bold text-ink-soft"
          >
            {suffix}
          </span>
        )}
      </div>
      <FieldMessages id={inputId} hint={hint} error={error} />
    </div>
  );
}
