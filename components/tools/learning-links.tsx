import Link from "next/link";
import { IconNotebook, IconStethoscope } from "@/components/ui/icons";

const LINKS = [
  {
    href: "/tools/preceptor",
    icon: IconStethoscope,
    title: "AI 프리셉터 모의질문",
    body: "병동 선생님이 묻는 질문에 답하면 AI가 평가하고 오답노트를 만들어요",
  },
  {
    href: "/tools/journal",
    icon: IconNotebook,
    title: "AI 실습일지",
    body: "오늘 메모만 남기면 나만 보는 성찰 일지 초안을 만들어 줘요",
  },
];

// 실습 도구 화면 위: AI 학습 도구 바로가기 (학생 계정 전용이라 카드에 "학생용" 표시)
export default function LearningLinks() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="press flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-soft hover:border-brand-deep"
        >
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-control bg-brand-soft text-title"
          >
            <l.icon size={26} />
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-ink">
              {l.title}{" "}
              <span className="ml-1 rounded-full bg-subtle px-2 py-0.5 align-middle text-caption font-bold text-ink-soft">
                학생용
              </span>
            </span>
            <span className="mt-0.5 block text-body-sm text-ink-soft">
              {l.body}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
