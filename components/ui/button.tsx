import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-deep text-surface hover:brightness-110",
  secondary: "bg-brand-soft text-brand-deep hover:brightness-95",
  ghost: "bg-transparent text-ink-soft hover:bg-subtle",
};

/** 버튼 모양 클래스(모서리 14, 누르면 0.97). 링크(<Link>)를 버튼처럼 보이게 할 때도 쓴다 */
export function buttonClass(variant: Variant = "primary", block = false) {
  return `press inline-flex min-h-(--size-touch) items-center justify-center gap-2 rounded-control px-5 text-body font-bold disabled:cursor-not-allowed disabled:opacity-55 ${
    block ? "w-full" : ""
  } ${VARIANT[variant]}`;
}

export default function Button({
  variant = "primary",
  block = false,
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; block?: boolean }) {
  return <button className={`${buttonClass(variant, block)} ${className}`} {...props} />;
}
