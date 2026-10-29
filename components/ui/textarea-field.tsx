import type { ComponentProps, ReactNode } from "react";
import { controlClass, describedBy, FieldMessages, labelClass } from "@/components/ui/field-parts";

// 라벨 + 여러 줄 입력 + 칸 바로 아래 경고(분홍, 예: 개인정보 주의)·오류. 한 화면에 같은 name이 여러 번 나오면 id를 따로 준다.
// 글이 길어지면 칸이 같이 늘어난다(field-sizing, 지원 안 하는 브라우저는 손으로 늘림)
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
  return (
    <div className={className}>
      <label htmlFor={inputId} className={labelClass}>
        {label}
      </label>
      <textarea
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(inputId, hint, error)}
        className={`${controlClass(Boolean(error))} min-h-28 resize-y px-4 py-3 leading-relaxed [field-sizing:content] max-h-[60vh]`}
        {...props}
      />
      <FieldMessages id={inputId} hint={hint} error={error} hintTone="warn" />
    </div>
  );
}
