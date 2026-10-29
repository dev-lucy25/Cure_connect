"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "@base-ui/react/select";
import { controlClass, describedBy, FieldMessages, labelClass } from "@/components/ui/field-parts";
import { IconCheck, IconChevronDown } from "@/components/ui/icons";

export type SelectOption = { value: string; label: string; disabled?: boolean };

// 드롭다운 (Base UI Select): 입력 칸과 같은 모양의 버튼 → 아래로 펼쳐지는 둥근 목록(고른 항목에 체크).
// 키보드(위아래·글자 입력·Enter·Esc)·화면 읽기는 Base UI가 맡고, 숨은 input으로 폼 값(name)이 그대로 전송된다.
// placeholder: 아직 안 골랐을 때 글자(값이 options에 없으면 보임). value ""인 항목은 "선택 안 함" 같은 보통 항목이다.
export default function SelectField({
  label,
  name,
  id,
  options,
  placeholder = "선택",
  defaultValue,
  value,
  onValueChange,
  error,
  hint,
  required,
  disabled,
  className = "",
}: {
  label: string;
  name: string;
  id?: string;
  options: readonly SelectOption[];
  placeholder?: string;
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const triggerId = id ?? name;
  // 폼이 초기화되면(저장 성공 뒤 React가 form.reset) 처음 값으로 되돌린다. 숨은 input은 reset이 닿지 않아 새로 그린다
  const box = useRef<HTMLDivElement>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form || value !== undefined) return;
    const onReset = () => setResetKey((k) => k + 1);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [value]);
  // options에 없는 값(빈 값 등)은 null → placeholder
  const known = (v: string | null | undefined) => (v != null && options.some((o) => o.value === v) ? v : null);
  const controlled = value !== undefined ? { value: known(value) } : { defaultValue: known(defaultValue) };
  return (
    <div ref={box} className={className}>
      <Select.Root
        key={resetKey}
        name={name}
        items={options}
        {...controlled}
        onValueChange={(v) => onValueChange?.((v as string | null) ?? "")}
        required={required}
        disabled={disabled}
      >
        <Select.Label className={labelClass}>{label}</Select.Label>
        <Select.Trigger
          id={triggerId}
          data-select={name}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(triggerId, hint, error)}
          className={`${controlClass(Boolean(error))} group flex min-h-(--size-touch) cursor-pointer items-center justify-between gap-2 px-4 text-left data-popup-open:border-brand-deep data-popup-open:bg-surface data-popup-open:focus-glow`}
        >
          <Select.Value placeholder={placeholder} className="min-w-0 truncate data-placeholder:text-ink-soft/60" />
          <Select.Icon className="shrink-0 text-ink-soft transition-transform duration-200 group-data-popup-open:rotate-180">
            <IconChevronDown size={18} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={8} alignItemWithTrigger={false} className="z-50 outline-none">
            <Select.Popup className="min-w-(--anchor-width) origin-(--transform-origin) rounded-popup border border-line bg-surface p-1.5 shadow-pop outline-none transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:scale-95 data-starting-style:opacity-0">
              <Select.List className="max-h-[min(var(--available-height),20rem)] overflow-y-auto overscroll-contain">
                {options.map((o) => (
                  <Select.Item
                    key={o.value}
                    value={o.value}
                    data-value={o.value}
                    disabled={o.disabled}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-body text-ink outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-45 data-highlighted:bg-subtle data-selected:font-bold data-selected:text-brand-deep"
                  >
                    <Select.ItemText>{o.label}</Select.ItemText>
                    <Select.ItemIndicator className="shrink-0">
                      <IconCheck size={18} strokeWidth={2.4} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <FieldMessages id={triggerId} hint={hint} error={error} />
    </div>
  );
}
