import type { ReactNode } from "react";

// 모든 화면 맨 위: 큰 제목(24) → 회색 설명 한 줄(13). action은 제목 오른쪽 버튼 자리
export default function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-headline text-ink">{title}</h1>
        <p className="mt-1 text-body-sm text-ink-soft">{description}</p>
      </div>
      {action}
    </div>
  );
}
