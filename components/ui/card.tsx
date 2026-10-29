import type { ComponentProps } from "react";

export default function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-card border border-line/70 bg-surface p-5 shadow-soft ${className}`} {...props} />;
}
