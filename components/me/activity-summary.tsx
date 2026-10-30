import Link from "next/link";
import type { ActivitySummary as Summary } from "@/server/activity-repo";
import { UPLOAD_REWARD } from "@/lib/credits";
import AnimatedNumber from "@/components/motion/animated-number";
import { buttonClass } from "@/components/ui/button-class";
import Card from "@/components/ui/card";
import { IconPencil } from "@/components/ui/icons";
import CreditMark from "@/components/ui/credit-mark";

// 내 정보: 크레딧 & 활동 요약. 숫자를 누르면 그 화면으로 간다
export default function ActivitySummary({ summary }: { summary: Summary }) {
  const items = [
    {
      label: "보유 크레딧",
      value: summary.credits,
      suffix: " C",
      href: "/credits",
      tone: "bg-brand-soft text-brand-deep",
    },
    {
      label: "열람한 족보",
      value: summary.unlocked,
      suffix: "개",
      href: "/notes",
      tone: "bg-subtle text-ink",
    },
    {
      label: "올린 족보",
      value: summary.myNotes,
      suffix: "개",
      href: "/notes",
      tone: "bg-subtle text-ink",
    },
    {
      label: "제출한 케이스",
      value: summary.submitted,
      suffix: "건",
      href: "/submissions",
      tone: "bg-subtle text-ink",
    },
  ];
  return (
    <Card>
      <h2 className="text-title font-bold text-ink">
        <CreditMark size={22} className="mr-1.5 inline align-[-0.2em]" />내
        크레딧 & 활동
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-center">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              href={i.href}
              className={`press block rounded-control px-2 py-3 ${i.tone}`}
              data-activity={i.label}
            >
              <span className="block text-caption font-bold opacity-80">
                {i.label}
              </span>
              <AnimatedNumber
                value={i.value}
                suffix={i.suffix}
                format={{ maximumFractionDigits: 0 }}
                className="font-display text-title"
              />
            </Link>
          </li>
        ))}
      </ul>
      {summary.graded > 0 && (
        <p className="mt-2 text-caption text-ink-soft">
          채점 받은 케이스 {summary.graded}건
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link href="/credits" className={buttonClass("secondary", true)}>
          <CreditMark size={16} /> 크레딧 충전
        </Link>
        <Link href="/notes?write=1" className={buttonClass("ghost", true)}>
          <IconPencil size={16} /> 족보 올리고 +{UPLOAD_REWARD} C
        </Link>
      </div>
    </Card>
  );
}
