import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT: Record<Variant, string> = {
  primary: "bg-mint-deep text-surface hover:brightness-110",
  secondary: "bg-mint-soft text-mint-deep hover:bg-mint",
  ghost: "bg-transparent text-ink-soft hover:bg-cream-deep",
};

/** 버튼 모양 클래스. 링크(<Link>)를 버튼처럼 보이게 할 때도 쓴다 */
export function buttonClass(variant: Variant = "primary", block = false) {
  return `inline-flex min-h-(--size-touch) items-center justify-center gap-2 rounded-control px-5 text-body font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
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
