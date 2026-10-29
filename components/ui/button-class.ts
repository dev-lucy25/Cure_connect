type Variant = "primary" | "secondary" | "outline" | "ghost";

// primary: 진한 민트 + 위쪽 얇은 빛 + 같은 색 그림자(떠 있는 느낌) / secondary: 옅은 민트 / outline: 흰 바탕 테두리 / ghost: 글자만
const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand-deep text-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.08),0_6px_16px_-6px_color-mix(in_oklab,var(--color-brand-deep)_60%,transparent)] hover:brightness-110",
  secondary: "bg-brand-soft text-brand-deep hover:bg-brand/45",
  outline: "border border-line bg-surface text-ink shadow-soft hover:border-line-strong hover:bg-subtle",
  ghost: "bg-transparent text-ink-soft hover:bg-ink/5 hover:text-ink",
};

export type ButtonVariant = Variant;

/**
 * 버튼 모양 클래스(모서리 14). 링크(<Link>)를 버튼처럼 보이게 할 때도 쓴다.
 * 서버 컴포넌트에서도 부르므로 "use client" 파일(button.tsx)과 나눠 둔다. 링크는 CSS(.press)로 눌림 효과를 준다.
 */
export function buttonClass(variant: Variant = "primary", block = false) {
  return `press inline-flex min-h-(--size-touch) items-center justify-center gap-2 rounded-control px-5 text-body font-bold transition-[filter,background-color,border-color,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none ${
    block ? "w-full" : ""
  } ${VARIANT[variant]}`;
}
