import type { ComponentProps, ReactNode } from "react";

// 44px 정사각 아이콘 버튼. 글자가 없으므로 label(스크린리더·툴팁용)은 꼭 준다.
export default function IconButton({
  label,
  tone = "default",
  className = "",
  children,
  ...props
}: ComponentProps<"button"> & { label: string; tone?: "default" | "danger"; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-11 place-items-center rounded-full transition disabled:opacity-50 ${
        tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-ink-soft hover:bg-cream-deep hover:text-ink"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
