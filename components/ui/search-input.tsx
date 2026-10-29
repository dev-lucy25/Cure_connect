import type { ComponentProps } from "react";
import { controlClass } from "@/components/ui/field-parts";
import { IconSearch } from "@/components/ui/icons";

// 검색 칸: 돋보기 아이콘 + 입력 칸 모양(Field와 같은 채움·포커스 빛). 라벨은 화면 읽기용으로만
export default function SearchInput({
  label,
  id,
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string; id: string }) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" />
      <input id={id} type="search" className={`${controlClass()} min-h-11 pr-4 pl-10 text-body-sm`} {...props} />
    </div>
  );
}
